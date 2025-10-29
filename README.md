# MED-BUDDY

MED-BUDDY is a comprehensive medical assistant application designed to streamline patient management, medication tracking, and AI-powered medical insights. This application leverages modern web technologies to provide a robust and user-friendly experience for healthcare professionals.

## Features

*   **Patient Management**: Securely store and manage patient demographic information.
*   **Medication Tracking**: Keep a detailed record of patient medications, dosages, and schedules.
*   **AI-Powered Medical Insights**: Utilize OpenAI API for advanced medical analysis and insights (e.g., discharge summaries, medication analysis).
*   **User Authentication**: Secure user registration and login with JWT-based authentication.
*   **Role-Based Access Control**: Differentiate access levels for various user roles.
*   **MongoDB Integration**: Persistent data storage using MongoDB Atlas.

## Technologies Used

*   **Frontend**: React, Vite
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (via Mongoose)
*   **AI Integration**: OpenAI API
*   **Authentication**: JSON Web Tokens (JWT)
*   **Other**: Dotenv for environment variables

## Setup Instructions

Follow these steps to get MED-BUDDY up and running on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/Salim77765/MED-BUDDY.git
cd MED-BUDDY
```

### 2. Environment Variables

Create a `.env` file in the `server` directory and populate it with the following:

```
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
PORT=5000
```

*   **`MONGODB_URI`**: Your MongoDB Atlas connection string. Make sure to replace `<username>`, `<password>`, and `<cluster-url>` with your actual credentials.
*   **`OPENAI_API_KEY`**: Your OpenAI API key. Ensure it has sufficient credits and is active.
*   **`JWT_SECRET`**: A strong, random string used for signing JWTs. You can generate one using `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
*   **`PORT`**: The port on which the server will run (default is 5000).

### 3. Install Dependencies

Navigate to both the `client` and `server` directories and install the necessary dependencies.

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

### 1. Start the Backend Server

From the `server` directory, run:

```bash
npm start
```

The server will start on the port specified in your `.env` file (default: `http://localhost:5000`).

### 2. Start the Frontend Application

From the `client` directory, run:

```bash
npm run dev
```

The client application will typically run on `http://localhost:5173` (or another available port).

## API Endpoints (Brief Overview)

The backend provides various API endpoints for:

*   User authentication (login, registration)
*   Patient management (CRUD operations)
*   Medication management (CRUD operations)
*   AI-powered features (e.g., `/api/ai/discharge-summary`, `/api/ai/medication-analysis`)

Refer to the `server/server.js` file for detailed endpoint definitions.

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests.