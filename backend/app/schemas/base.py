from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base Pydantic model configuring camelCase aliases and ORM mode.
    
    Accepts both camelCase and snake_case in input payloads.
    Serializes to camelCase by default to maintain exact compatibility
    with frontend TypeScript contracts.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
