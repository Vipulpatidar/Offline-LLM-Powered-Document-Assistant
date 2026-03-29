# Setup Instructions for Offline-LLM-Powered-Document-Assistant Backend

## Prerequisites
- Ensure you have Python 3.8 or later installed.
- Make sure you have Git installed on your system.
- Install required packages:
  ```bash
  pip install -r requirements.txt
  ```

## Cloning the Repository
1. Open your terminal.
2. Clone the repository using the command:
   ```bash
   git clone https://github.com/<repository-owner>/Offline-LLM-Powered-Document-Assistant.git
   ```
3. Navigate to the backend directory:
   ```bash
   cd Offline-LLM-Powered-Document-Assistant/backend
   ```

## Setting up llama.cpp
1. Navigate to `llama.cpp` subdirectory if necessary, or clone it if it's not included:
   ```bash
   git clone https://github.com/<repository-owner>/llama.cpp.git
   ```
2. Follow the setup instructions provided in `llama.cpp` repository to compile and install.
3. Ensure the necessary libraries are installed (refer to `llama.cpp` documentation).

## Model Downloading
1. Download the pre-trained models:
   - Visit the [model release link](https://huggingface.co/models) or respective source.
   - Download the models and place them in the `models/` directory within the backend folder.
2. Make sure to verify the integrity of the downloaded models, if applicable.

## Running the Application
- After all setups, run the backend application using:
  ```bash
  python app.py
  ```
- Ensure you have the necessary environment variables set up as per your application needs (if any).

## Troubleshooting
- Refer to `README.md` in the root directory for common issues and resolutions.

## Note
- Replace `<repository-owner>` with the actual username or organization that owns the repository.

**Happy Coding!**