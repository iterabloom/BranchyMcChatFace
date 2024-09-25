from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import base64
from datetime import datetime
from mock_llm import mock_llm

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessages(BaseModel):
    messages: list
    llm_choice: str


class FeedbackData(BaseModel):
    screenshot: str
    localState: str


LLM_ENDPOINTS = {
    "openai": "https://api.openai.com/v1/chat/completions",
    "anthropic": "https://api.anthropic.com/v1/complete",
    # Add more LLM endpoints as needed
}


async def call_llm_api(llm_choice, messages):
    if llm_choice == "mock":
        return mock_llm.generate_response(messages)

    api_key = os.getenv(f"{llm_choice.upper()}_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail=f"API key for {llm_choice} not found")

    endpoint = LLM_ENDPOINTS.get(llm_choice)
    if not endpoint:
        raise HTTPException(status_code=400, detail=f"Endpoint for {llm_choice} not found")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Adjust the data structure based on the specific LLM API requirements
    data = {
        "model": "gpt-3.5-turbo" if llm_choice == "openai" else "",
        "messages": messages if llm_choice == "openai" else "",
        "prompt": messages if llm_choice == "anthropic" else "",
        # Add more fields as needed for different LLMs
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(endpoint, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        # Extract the response based on the specific LLM API response structure
        if llm_choice == "openai":
            return result['choices'][0]['message']['content']
        elif llm_choice == "anthropic":
            return result['completion']
        # Add more conditions for other LLMs
    else:
        raise HTTPException(status_code=500, detail=f"Failed to get response from {llm_choice} API")


@app.post("/chat")
async def chat(chat_messages: ChatMessages):
    try:
        ai_message = await call_llm_api(chat_messages.llm_choice, chat_messages.messages)
        return {"response": ai_message}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback")
async def submit_feedback(feedback: FeedbackData):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    feedback_dir = "feedback"
    os.makedirs(feedback_dir, exist_ok=True)

    # Save screenshot
    img_data = base64.b64decode(feedback.screenshot.split(',')[1])
    with open(f"{feedback_dir}/screenshot_{timestamp}.png", "wb") as f:
        f.write(img_data)

    # Save local state
    with open(f"{feedback_dir}/state_{timestamp}.json", "w") as f:
        f.write(feedback.localState)

    return {"message": "Feedback received successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)