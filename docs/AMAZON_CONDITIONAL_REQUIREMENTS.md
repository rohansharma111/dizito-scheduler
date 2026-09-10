# Amazon Conditional Listing Requirements

Amazon product-type schemas can require attributes conditionally. Dizito must not present every conditional branch as required before the seller's current product data is known.

The Amazon schema helper now evaluates the supported conditional constructs against the current draft attributes:

- `if` / `then` / `else`
- `dependentSchemas`
- conditional branches inside `allOf`, `anyOf`, and `oneOf`
- `required` declarations within matched conditional branches

When no current attributes are available, conditional requirements are intentionally not surfaced. The root `required` list remains authoritative for unconditional requirements.

The validation-preview route evaluates the fetched product-only schema against the exact draft sent to Amazon and returns the evaluated schema summary alongside Amazon's validation response. Amazon validation issues remain the final provider response and can surface additional fields that require seller input.

This is intentionally a focused evaluator rather than a full JSON Schema implementation. Unsupported schema keywords are left to Amazon's own validation rather than being guessed by Dizito.
