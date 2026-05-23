import pytest

from gmail_cleaner.rules import Action, RuleValidationError, load_rules_from_data


def test_load_rules_from_data_accepts_valid_rule():
    rules = load_rules_from_data(
        {
            "rules": [
                {
                    "name": "promocoes",
                    "query": "category:promotions older_than:180d",
                    "action": "trash",
                    "max_messages": 25,
                }
            ]
        }
    )

    assert len(rules) == 1
    assert rules[0].name == "promocoes"
    assert rules[0].action is Action.TRASH
    assert rules[0].max_messages == 25


def test_label_action_requires_label_name():
    with pytest.raises(RuleValidationError, match="requires label"):
        load_rules_from_data(
            {
                "rules": [
                    {
                        "name": "recibos",
                        "query": "from:billing@example.com",
                        "action": "label",
                    }
                ]
            }
        )


def test_delete_action_requires_rule_level_confirmation():
    with pytest.raises(RuleValidationError, match="permanent delete"):
        load_rules_from_data(
            {
                "rules": [
                    {
                        "name": "spam",
                        "query": "in:spam older_than:365d",
                        "action": "delete",
                    }
                ]
            }
        )


def test_max_messages_must_be_positive_integer():
    with pytest.raises(RuleValidationError, match="positive integer"):
        load_rules_from_data(
            {
                "rules": [
                    {
                        "name": "bad",
                        "query": "older_than:1d",
                        "action": "archive",
                        "max_messages": 0,
                    }
                ]
            }
        )
