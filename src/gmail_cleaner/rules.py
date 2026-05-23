from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any


class RuleValidationError(ValueError):
    """Raised when a cleanup rule is unsafe or malformed."""


class Action(str, Enum):
    ARCHIVE = "archive"
    TRASH = "trash"
    DELETE = "delete"
    LABEL = "label"
    MARK_READ = "mark_read"


@dataclass(frozen=True)
class CleanupRule:
    name: str
    query: str
    action: Action
    max_messages: int = 100
    label: str | None = None
    allow_permanent_delete: bool = False

    @classmethod
    def from_mapping(cls, raw: dict[str, Any], index: int) -> "CleanupRule":
        context = f"rule #{index + 1}"
        name = _required_string(raw, "name", context)
        query = _required_string(raw, "query", context)

        action_value = _required_string(raw, "action", context)
        try:
            action = Action(action_value)
        except ValueError as exc:
            valid = ", ".join(item.value for item in Action)
            raise RuleValidationError(
                f"{context} ({name!r}) has invalid action {action_value!r}; "
                f"use one of: {valid}"
            ) from exc

        max_messages = raw.get("max_messages", 100)
        if not isinstance(max_messages, int) or max_messages < 1:
            raise RuleValidationError(
                f"{context} ({name!r}) must set max_messages to a positive integer"
            )

        label = raw.get("label")
        if label is not None and not isinstance(label, str):
            raise RuleValidationError(f"{context} ({name!r}) label must be a string")

        if action is Action.LABEL and not label:
            raise RuleValidationError(f"{context} ({name!r}) action 'label' requires label")

        allow_permanent_delete = bool(raw.get("allow_permanent_delete", False))
        if action is Action.DELETE and not allow_permanent_delete:
            raise RuleValidationError(
                f"{context} ({name!r}) uses permanent delete; set "
                "allow_permanent_delete: true in the rule and pass --allow-delete"
            )

        return cls(
            name=name,
            query=query,
            action=action,
            max_messages=max_messages,
            label=label,
            allow_permanent_delete=allow_permanent_delete,
        )


def load_rules_from_data(data: dict[str, Any]) -> list[CleanupRule]:
    raw_rules = data.get("rules")
    if not isinstance(raw_rules, list) or not raw_rules:
        raise RuleValidationError("configuration must contain a non-empty 'rules' list")

    rules: list[CleanupRule] = []
    for index, raw_rule in enumerate(raw_rules):
        if not isinstance(raw_rule, dict):
            raise RuleValidationError(f"rule #{index + 1} must be a mapping")
        rules.append(CleanupRule.from_mapping(raw_rule, index))
    return rules


def load_rules(path: Path) -> list[CleanupRule]:
    try:
        import yaml
    except ImportError as exc:  # pragma: no cover - dependency is declared in pyproject
        raise RuntimeError("PyYAML is required to read rule files") from exc

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}

    if not isinstance(data, dict):
        raise RuleValidationError("configuration file must contain a mapping")
    return load_rules_from_data(data)


def _required_string(raw: dict[str, Any], key: str, context: str) -> str:
    value = raw.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RuleValidationError(f"{context} must define a non-empty string '{key}'")
    return value.strip()
