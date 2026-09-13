# PayShield — Lure Script Dataset Specification

## Purpose

The lure-script dataset will provide synthetic text samples for the
Lure Evidence Stream of PayShield.

The dataset will be used to train and evaluate a classifier that identifies
common social-engineering and scam-lure patterns.

## Dataset Categories

The initial dataset will contain four categories:

1. Fake CBI / Police
2. Fake Bank KYC
3. Fake Refund / Collect Request
4. Fake Technical Support

## Target Size

Target: 200–500 examples per category.

Initial target:

- Fake CBI / Police: 200–500
- Fake Bank KYC: 200–500
- Fake Refund / Collect Request: 200–500
- Fake Technical Support: 200–500

Total target: 800–2,000 examples.

## Example Data Fields

Each example should contain:

- `text` — the synthetic scam/lure message
- `category` — the lure category
- `severity` — relative severity of the lure
- `language` — language of the message
- `source_type` — SMS, chat, email, phone-script transcript, etc.

## Generation Strategy

Dataset generation will use a combination of:

- Hand-written examples
- Template-based generation
- LLM-generated synthetic examples

The final generation approach will be determined during implementation.

## Important Constraints

The dataset must contain synthetic examples only.

No real victim information, phone numbers, financial information,
credentials, or personally identifiable information should be included.

The dataset should contain meaningful variation in wording, structure,
urgency, impersonation techniques, and requested actions.

## Status

Specification completed.

Dataset generation will be handled separately.