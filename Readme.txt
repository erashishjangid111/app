- Node.js (v14 or higher)
- MongoDB Atlas account (for database)
- Git (for version control)

1. Extract the code file from zip

2. Install Dependencies
```bash
npm install
```
Optional

3. **Environment Setup**

Create a `.env` file in the root directory with the following content:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=8000
SESSION_SECRET=your_session_secret
```

Running the Application

1. Start the Server
```bash
node app.js
```
or if you have nodemon installed:
```bash
nodemon app.js
```

2. Access the Application
- Open your browser and navigate to: `http://localhost:8000`

Default Admin Account

The first user you register will automatically become an admin. To create an admin account:

1. Click on "Register" in the navigation
2. Fill in the registration form
3. Login with your credentials




Admin credentials:
Username: admin
Password: admin123