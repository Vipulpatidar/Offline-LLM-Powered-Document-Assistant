# Backend Setup

## Model Directory Structure
```
/models
└── llama
    ├── config.json
    ├── model.bin
    ├── tokenizer.json
    └── ...
```

## Llama.cpp Installation
1. Clone the repository:
   ```
git clone https://github.com/yourusername/llama.cpp.git
```
2. Navigate to the directory:
   ```
cd llama.cpp
```
3. Install dependencies and build:
   ```
make
```

## Server Startup Instructions
To start the server, run the following command in your terminal:
```
python server.py
```