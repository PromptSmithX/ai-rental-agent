from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.ai.schemas.responses import AgentChatRequest, AgentChatResponse
from app.ai.services.agent_service import agent_service

router = APIRouter()


@router.post(
    "/chat",
    response_model=AgentChatResponse,
    summary="Execute multi-turn conversational AI turn synchronously",
    description="Invokes the controlled LangGraph workflow and returns a complete, grounded AgentReply.",
)
def chat_endpoint(request: AgentChatRequest) -> AgentChatResponse:
    if not request.thread_id or not request.thread_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="thread_id is required",
        )
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message cannot be empty",
        )

    try:
        return agent_service.run_turn(
            thread_id=request.thread_id,
            message=request.message,
            current_filters=request.current_filters,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}",
        )


@router.post(
    "/chat/stream",
    summary="Stream AI Agent execution events and final reply via SSE",
    description="Streams real-time milestone events (agent_event) and final response (agent_reply) via Server-Sent Events.",
)
def chat_stream_endpoint(request: AgentChatRequest):
    if not request.thread_id or not request.thread_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="thread_id is required",
        )
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message cannot be empty",
        )

    generator = agent_service.stream_turn(
        thread_id=request.thread_id,
        message=request.message,
        current_filters=request.current_filters,
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/conversations/{thread_id}",
    summary="Get conversation state and message history",
    description="Returns persistent filters, active campus, and message transcript for a thread.",
)
def get_conversation_endpoint(thread_id: str):
    if not thread_id or not thread_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="thread_id is required",
        )
    return agent_service.get_conversation(thread_id)


@router.delete(
    "/conversations/{thread_id}",
    summary="Reset conversation state",
    description="Clears persistent memory checkpoints for the given thread_id.",
)
def clear_conversation_endpoint(thread_id: str):
    if not thread_id or not thread_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="thread_id is required",
        )
    agent_service.clear_conversation(thread_id)
    return {"status": "cleared", "threadId": thread_id}
