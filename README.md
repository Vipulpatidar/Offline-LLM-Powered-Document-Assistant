# Backend Setup Instructions

This document explains how to set up and run the backend server.

---

# 1. Create Model Directory

Create a folder named `model_files` inside backend:

```
backend/
└── model_files/
    ├── embedding/
    └── llm/
```

Verify:

```bash
cd backend/model_files
ls
```

Output:

```
embedding  llm
```

---

# 2. Download Models

### Embedding Model

Download the embedding model into:

```
backend/model_files/embedding/
```

### LLM GGUF Model

Download your GGUF model into:

```
backend/model_files/llm/
```

Example:

```
mistral-7b-instruct-v0.2.Q4_K_M.gguf
```

---

# 3. Clone llama.cpp inside backend

From backend folder:

```bash
git clone https://github.com/ggerganov/llama.cpp.git
```

Project structure should look like:

```
backend/
├── main.py
├── model_files/
│   ├── embedding/
│   └── llm/
└── llama.cpp/
```

---

# 4. Build llama.cpp

```bash
cd llama.cpp
make
```

For GPU (optional):

```bash
make LLAMA_CUBLAS=1
```

You can also follow the official llama.cpp repo for advanced setup.

---

# 5. Start llama.cpp Server

Run from inside `llama.cpp` folder:

```bash
./llama-server \
-m ../model_files/llm/mistral-7b-instruct-v0.2.Q4_K_M.gguf \
-ngl 20 \
-c 2048 \
--host 0.0.0.0 \
--port 8090
```

This starts the LLM server at:

```
http://localhost:8090
```

---

# 6. Start Backend API Server

From backend directory:

```bash
uvicorn main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

---

# Final Startup Order

Start in this order:

### Terminal 1

Start llama server

```bash
cd backend/llama.cpp
./llama-server -m ../model_files/llm/mistral-7b-instruct-v0.2.Q4_K_M.gguf -ngl 20 -c 2048 --host 0.0.0.0 --port 8090
```

### Terminal 2

Start backend

```bash
cd backend
uvicorn main:app --reload
```

---

# Folder Structure (Final)

```
backend/
│
├── main.py
├── model_files/
│   ├── embedding/
│   └── llm/
│       └── mistral-7b-instruct-v0.2.Q4_K_M.gguf
│
└── llama.cpp/
```

---

# Done

Backend is now ready to use.

---

# Frontend Setup Instructions

Navigate to frontend folder:

```bash
cd frontend
```

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Build Frontend

```bash
npm run build
```

---

## 3. Start Frontend Dev Server

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

# Full Project Startup

You need **3 terminals**.

## Terminal 1 — Start LLM Server

```bash
cd backend/llama.cpp
./llama-server -m ../model_files/llm/mistral-7b-instruct-v0.2.Q4_K_M.gguf -ngl 20 -c 2048 --host 0.0.0.0 --port 8090
```

---

## Terminal 2 — Start Backend

```bash
cd backend
uvicorn main:app --reload
```

---

## Terminal 3 — Start Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

---

# Final Project Structure

```
project-root/
│
├── backend/
│   ├── main.py
│   ├── model_files/
│   │   ├── embedding/
│   │   └── llm/
│   └── llama.cpp/
│
└── frontend/
    ├── package.json
    └── src/
```

---

# Application URLs

Frontend:

```
http://localhost:5173
```

Backend API:

```
http://localhost:8000
```

LLM Server:

```
http://localhost:8090
```

---

# Setup Complete

Your full stack application is now running locally. 🚀
