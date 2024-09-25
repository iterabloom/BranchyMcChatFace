# BranchyMcChatFace

This application is an AI-powered chat interface featuring conversation branching capabilities. It combines a React frontend with a FastAPI backend, utilizes Docker for containerization, and includes features such as feedback submission with screenshot annotation.

## Key Features

- Tree-like conversation structure with branching capabilities
- Support for multiple Language Models (LLMs)
- Dynamic conversation actions (deepening and broadening)
- Feedback mechanism with screenshot capture and annotation
- Containerized architecture for consistent deployment

## Architecture

### Backend (Python/FastAPI)

- Handles API requests for chat interactions and feedback submission
- Supports multiple LLMs, including a mock LLM for testing
- Utilizes environment variables for secure API key management

### Frontend (React)

- Implements an intuitive tree-like conversation UI
- Supports dynamic conversation actions
- Features a comprehensive feedback mechanism

### Docker

- Containerizes frontend and backend services
- Uses docker-compose for orchestration

## Prerequisites

- Docker and Docker Compose
- Node.js v14+ (for local development)
- Python 3.9+ (for local development)

## Installation

1. Clone the repository:
   ```
   git clone [https://github.com/iterabloom/BranchyMcChatFace.git](https://github.com/iterabloom/BranchyMcChatFace)
   cd BranchyMcChatFace
   ```

2. Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

3. Build and run Docker containers:
   ```
   docker-compose up --build
   ```

4. Access the application at `http://localhost:3000`

## Usage Guide

1. Start a new conversation or continue an existing one.
2. Use the "DEEPEN" button to explore a conversation branch further.
3. Use the "BROADEN" button to create alternative conversation paths.
4. Submit feedback using the feedback button for screenshot annotations.

## Development Setup

### Backend

```
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```
cd frontend
npm install
npm start
```

## API Documentation

API endpoints are documented using OpenAPI (Swagger). Access the documentation at `http://localhost:8000/docs` when running the backend.


## License

This project is licensed under the Mozilla Public License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- FastAPI and React communities for their excellent frameworks
