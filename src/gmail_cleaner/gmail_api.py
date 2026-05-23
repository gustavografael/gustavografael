from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .rules import Action, CleanupRule


SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
METADATA_HEADERS = ["From", "Subject", "Date"]
BATCH_LIMIT = 1000


@dataclass(frozen=True)
class MessageSummary:
    id: str
    from_: str
    subject: str
    date: str


@dataclass(frozen=True)
class RuleResult:
    rule: CleanupRule
    messages: list[MessageSummary]


def build_service(credentials_path: Path, token_path: Path) -> Any:
    """Create an authenticated Gmail API service."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as exc:  # pragma: no cover - dependency is declared in pyproject
        raise RuntimeError(
            "Google API dependencies are missing. Run: python -m pip install -e ."
        ) from exc

    credentials = None
    if token_path.exists():
        credentials = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            if not credentials_path.exists():
                raise FileNotFoundError(
                    f"Google OAuth credentials not found at {credentials_path}. "
                    "Create an OAuth Desktop client in Google Cloud and download it."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
            credentials = flow.run_local_server(port=0)

        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(credentials.to_json(), encoding="utf-8")

    return build("gmail", "v1", credentials=credentials)


class GmailCleaner:
    def __init__(self, service: Any, user_id: str = "me") -> None:
        self.service = service
        self.user_id = user_id

    def preview_rule(self, rule: CleanupRule) -> RuleResult:
        ids = self._list_message_ids(rule.query, rule.max_messages)
        messages = [self._get_message_summary(message_id) for message_id in ids]
        return RuleResult(rule=rule, messages=messages)

    def apply_rule(
        self,
        rule: CleanupRule,
        *,
        allow_delete: bool = False,
        progress: Callable[[str], None] | None = None,
    ) -> int:
        if rule.action is Action.DELETE and not allow_delete:
            raise ValueError("permanent delete requires --allow-delete")

        ids = self._list_message_ids(rule.query, rule.max_messages)
        if not ids:
            return 0

        if progress:
            progress(f"{rule.name}: applying {rule.action.value} to {len(ids)} messages")

        if rule.action is Action.ARCHIVE:
            self._batch_modify(ids, remove_label_ids=["INBOX"])
        elif rule.action is Action.MARK_READ:
            self._batch_modify(ids, remove_label_ids=["UNREAD"])
        elif rule.action is Action.LABEL:
            self._batch_modify(ids, add_label_ids=[self._ensure_label_id(rule.label or "")])
        elif rule.action is Action.TRASH:
            for message_id in ids:
                self.service.users().messages().trash(
                    userId=self.user_id,
                    id=message_id,
                ).execute()
        elif rule.action is Action.DELETE:
            for chunk in _chunked(ids, BATCH_LIMIT):
                self.service.users().messages().batchDelete(
                    userId=self.user_id,
                    body={"ids": chunk},
                ).execute()
        else:  # pragma: no cover - Action validation keeps this unreachable
            raise ValueError(f"unsupported action: {rule.action}")

        return len(ids)

    def _list_message_ids(self, query: str, limit: int) -> list[str]:
        ids: list[str] = []
        page_token: str | None = None

        while len(ids) < limit:
            response = self.service.users().messages().list(
                userId=self.user_id,
                q=query,
                maxResults=min(500, limit - len(ids)),
                pageToken=page_token,
            ).execute()

            ids.extend(message["id"] for message in response.get("messages", []))
            page_token = response.get("nextPageToken")
            if not page_token:
                break

        return ids[:limit]

    def _get_message_summary(self, message_id: str) -> MessageSummary:
        message = self.service.users().messages().get(
            userId=self.user_id,
            id=message_id,
            format="metadata",
            metadataHeaders=METADATA_HEADERS,
        ).execute()
        headers = _headers_to_dict(message.get("payload", {}).get("headers", []))
        return MessageSummary(
            id=message_id,
            from_=headers.get("from", ""),
            subject=headers.get("subject", ""),
            date=headers.get("date", ""),
        )

    def _batch_modify(
        self,
        ids: Iterable[str],
        *,
        add_label_ids: list[str] | None = None,
        remove_label_ids: list[str] | None = None,
    ) -> None:
        for chunk in _chunked(list(ids), BATCH_LIMIT):
            body = {
                "ids": chunk,
                "addLabelIds": [label for label in add_label_ids or [] if label],
                "removeLabelIds": [label for label in remove_label_ids or [] if label],
            }
            self.service.users().messages().batchModify(
                userId=self.user_id,
                body=body,
            ).execute()

    def _ensure_label_id(self, label_name: str) -> str:
        labels = self.service.users().labels().list(userId=self.user_id).execute()
        for label in labels.get("labels", []):
            if label.get("id") == label_name or label.get("name") == label_name:
                return label["id"]

        created = self.service.users().labels().create(
            userId=self.user_id,
            body={
                "name": label_name,
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
            },
        ).execute()
        return created["id"]


def _headers_to_dict(headers: list[dict[str, str]]) -> dict[str, str]:
    return {
        header.get("name", "").lower(): header.get("value", "")
        for header in headers
        if header.get("name")
    }


def _chunked(items: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]
