from gmail_cleaner.gmail_api import GmailCleaner, _chunked, _headers_to_dict
from gmail_cleaner.rules import CleanupRule, Action


class FakeRequest:
    def __init__(self, response):
        self.response = response

    def execute(self):
        return self.response


class FakeMessages:
    def __init__(self):
        self.batch_modify_bodies = []
        self.trashed_ids = []
        self.deleted_bodies = []

    def list(self, **kwargs):
        return FakeRequest({"messages": [{"id": "m1"}, {"id": "m2"}]})

    def get(self, **kwargs):
        return FakeRequest(
            {
                "payload": {
                    "headers": [
                        {"name": "From", "value": "sender@example.com"},
                        {"name": "Subject", "value": "Hello"},
                        {"name": "Date", "value": "Sat, 23 May 2026"},
                    ]
                }
            }
        )

    def batchModify(self, **kwargs):
        self.batch_modify_bodies.append(kwargs["body"])
        return FakeRequest({})

    def trash(self, **kwargs):
        self.trashed_ids.append(kwargs["id"])
        return FakeRequest({})

    def batchDelete(self, **kwargs):
        self.deleted_bodies.append(kwargs["body"])
        return FakeRequest({})


class FakeLabels:
    def __init__(self):
        self.created = []

    def list(self, **kwargs):
        return FakeRequest({"labels": [{"id": "Label_1", "name": "Financeiro"}]})

    def create(self, **kwargs):
        self.created.append(kwargs["body"]["name"])
        return FakeRequest({"id": "Label_2"})


class FakeUsers:
    def __init__(self):
        self.messages_resource = FakeMessages()
        self.labels_resource = FakeLabels()

    def messages(self):
        return self.messages_resource

    def labels(self):
        return self.labels_resource


class FakeService:
    def __init__(self):
        self.users_resource = FakeUsers()

    def users(self):
        return self.users_resource


def test_preview_rule_returns_message_summaries():
    service = FakeService()
    cleaner = GmailCleaner(service)
    rule = CleanupRule(
        name="preview",
        query="older_than:1d",
        action=Action.ARCHIVE,
        max_messages=2,
    )

    result = cleaner.preview_rule(rule)

    assert [message.id for message in result.messages] == ["m1", "m2"]
    assert result.messages[0].from_ == "sender@example.com"
    assert result.messages[0].subject == "Hello"


def test_apply_archive_uses_batch_modify_remove_inbox():
    service = FakeService()
    cleaner = GmailCleaner(service)
    rule = CleanupRule(
        name="archive",
        query="older_than:1d",
        action=Action.ARCHIVE,
        max_messages=2,
    )

    count = cleaner.apply_rule(rule)

    assert count == 2
    assert service.users_resource.messages_resource.batch_modify_bodies == [
        {"ids": ["m1", "m2"], "addLabelIds": [], "removeLabelIds": ["INBOX"]}
    ]


def test_apply_label_resolves_existing_label_name():
    service = FakeService()
    cleaner = GmailCleaner(service)
    rule = CleanupRule(
        name="label",
        query="older_than:1d",
        action=Action.LABEL,
        max_messages=2,
        label="Financeiro",
    )

    cleaner.apply_rule(rule)

    assert service.users_resource.messages_resource.batch_modify_bodies == [
        {"ids": ["m1", "m2"], "addLabelIds": ["Label_1"], "removeLabelIds": []}
    ]


def test_headers_to_dict_normalizes_header_names():
    assert _headers_to_dict([{"name": "Subject", "value": "Oi"}]) == {"subject": "Oi"}


def test_chunked_splits_lists():
    assert list(_chunked(["a", "b", "c"], 2)) == [["a", "b"], ["c"]]
