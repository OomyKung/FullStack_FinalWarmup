const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

/* =========================
   CONFIG (EDIT HERE)
   ========================= */

// Define all jobs to generate PDFs
const PDF_JOBS = [
  { inputDir: ".", outputFile: "Backend_API_Server.pdf", extensions: ["app.js"] },
  { inputDir: ".", outputFile: "Frontend_Web_Server.pdf", extensions: ["frontend-server.js"] },
  { inputDir: "views", outputFile: "Frontend_EJS_Templates.pdf", extensions: [".ejs"] },
  { inputDir: "public/css", outputFile: "Frontend_CSS_Styles.pdf", extensions: [".css"] },
  { inputDir: "controllers", outputFile: "Backend_Controllers.pdf", extensions: [".js"] },
  { inputDir: "models", outputFile: "Backend_Models_Database.pdf", extensions: [".js"] },
  { inputDir: "routes", outputFile: "Backend_Routes_API.pdf", extensions: [".js"] },
  { inputDir: "database", outputFile: "Backend_Database_Seed.pdf", extensions: [".js"] },
];

const OUTPUT_DIR = "final_pdfs";

// Exclude generator file(s)
const EXCLUDE_FILES = new Set(["pdfconverter.js", "pdfconverter.mjs"]);

// A4 page size (portrait)
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

// Margins (smaller = more content per page)
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 25;

// Text layout
const FONT_SIZE = 8.5;
const LINE_HEIGHT = FONT_SIZE * 1.25;
const MAX_LINE_LENGTH = 120;

// Run JS output settings
const RUN_TIMEOUT = 5000;

// Border settings
const BORDER_PADDING = 8;
const BORDER_THICKNESS = 0.8;

/* =========================
   HELPERS
   ========================= */

// Fix pdf-lib standard fonts encoding crash (emoji/Thai/etc.)
function sanitize(text) {
  if (!text) return "";
  return text.replace(/[^\x00-\xFF]/g, "?");
}

// Natural sort: 1.js, 2.js, 10.js
function naturalSort(a, b) {
  const ax = [];
  const bx = [];

  a.replace(/(\d+)|(\D+)/g, (_, num, str) => ax.push([num || Infinity, str || ""]));
  b.replace(/(\d+)|(\D+)/g, (_, num, str) => bx.push([num || Infinity, str || ""]));

  while (ax.length && bx.length) {
    const [aNum, aStr] = ax.shift();
    const [bNum, bStr] = bx.shift();

    if (Number(aNum) !== Number(bNum)) return Number(aNum) - Number(bNum);
    if (aStr !== bStr) return aStr.localeCompare(bStr);
  }

  return ax.length - bx.length;
}

// Generate explanation by analyzing file content
async function generateFileExplanation(filePath, fileName) {
  const code = await fs.readFile(filePath, "utf-8");
  const extension = fileName.split(".").pop();

  if (extension === "css") {
    return generateCssExplanation(code, fileName);
  } else if (extension === "ejs") {
    return generateEjsExplanation(code, fileName, filePath);
  } else if (extension === "js") {
    return generateJsExplanation(code, fileName, filePath);
  }

  return "Unknown file type";
}

// Detect file type/purpose for context-aware explanations
function detectFileType(fileName, filePath) {
  if (fileName === "frontend-server.js") {
    return "frontend-server";
  }
  if (fileName === "app.js") {
    return "backend-api";
  }
  if (fileName === "index.js" && filePath.includes("models")) {
    return "model-index";
  }
  if (fileName.includes("Model") || fileName === "Student.js" || fileName === "Subject.js" || fileName === "Enrollment.js") {
    return "model";
  }
  if (fileName.includes("Controller")) return "controller";
  if (fileName.includes("Routes")) return "routes";
  if (fileName.includes("seed")) return "seed";
  if (filePath.includes("views")) return "view";
  return "other";
}

// Analyze CSS file and generate explanation
function generateCssExplanation(code, fileName) {
  const selectors = code.match(/^[^{]*(?={)/gm) || [];
  const uniqueSelectors = new Set(selectors.map((s) => s.trim()).filter((s) => s));
  const hasKeyframes = /(@keyframes|@media)/i.test(code);
  const hasVariables = /(--[a-z-]+:|var\()/i.test(code);
  const hasTransitions = /(transition|animation|transform)/i.test(code);
  const hasFlexbox = /(display\s*:\s*flex|flex-)/i.test(code);
  const hasGrid = /(display\s*:\s*grid|grid-)/i.test(code);

  let explanation = `CSS Stylesheet - This file controls the visual appearance and layout of the website.\n\n`;
  explanation += `What it does: CSS makes the website look pretty by styling colors, fonts, sizes, spacing, and layout.\n\n`;

  explanation += `Key styling elements: ${uniqueSelectors.size} different styles\n`;
  explanation += `Examples: ${
    Array.from(uniqueSelectors).slice(0, 3).join(", ") +
    (uniqueSelectors.size > 3 ? ", ..." : "")
  }\n\n`;

  if (hasFlexbox) {
    explanation += "Layout type: Uses Flexbox - a modern way to arrange items in rows or columns\n";
  }
  if (hasGrid) {
    explanation += "Layout type: Uses CSS Grid - a powerful way to create 2D layouts\n";
  }

  if (hasTransitions) {
    explanation += "Animations: Includes smooth transitions and movement effects\n";
  }

  if (hasKeyframes) {
    explanation += "Advanced animations: Contains custom animation sequences and responsive design for different screen sizes\n";
  }

  if (hasVariables) {
    explanation += "Smart styling: Uses CSS variables to store reusable colors and values\n";
  }

  const lineCount = code.split("\n").length;
  explanation += `\nTotal lines of code: ${lineCount}`;

  return explanation;
}

// Analyze EJS file and generate explanation
function generateEjsExplanation(code, fileName, filePath) {
  const templates = code.match(/<%[\s\S]*?%>/g) || [];
  const hasLoop = /<%\s*for|forEach/.test(code);
  const hasCondition = /<%\s*if/.test(code);
  const hasInclude = /<%\s*include/.test(code);
  const forms = (code.match(/<form/gi) || []).length;
  const tables = (code.match(/<table|<tr/gi) || []).length;
  const inputs = (code.match(/<input|<select|<textarea/gi) || []).length;
  const buttons = (code.match(/<button|type="submit"/gi) || []).length;

  let explanation = `EJS Template - A dynamic web page that generates HTML.\n\n`;

  // Add context for specific views
  if (fileName.includes("student")) {
    explanation += `UNIVERSITY ENROLLMENT SYSTEM - Student Management Page\n`;
    explanation += `This page helps administrators view, add, edit, and delete student records.\n`;
    explanation += `A student record includes: ID, Student Code, Full Name, and Major (area of study)\n\n`;
  } else if (fileName.includes("subject")) {
    explanation += `UNIVERSITY ENROLLMENT SYSTEM - Subject/Course Management Page\n`;
    explanation += `This page helps administrators manage courses offered at the university.\n`;
    explanation += `A subject record includes: ID, Subject Code, Name, and Number of Credits\n\n`;
  } else if (fileName.includes("enrollment")) {
    explanation += `UNIVERSITY ENROLLMENT SYSTEM - Enrollment Management Page\n`;
    explanation += `This page shows which students are enrolled in which courses.\n`;
    explanation += `An enrollment record links a Student to a Subject with an enrollment date\n\n`;
  } else if (fileName.includes("enrollment-summary")) {
    explanation += `UNIVERSITY ENROLLMENT SYSTEM - Enrollment Report\n`;
    explanation += `This report shows a summary of enrollments, helping administrators understand course popularity.\n`;
    explanation += `The report displays data in a structured format for analysis\n\n`;
  } else if (fileName.includes("header")) {
    explanation += `Header/Navigation - The top part of every page.\n`;
    explanation += `This is a reusable component that appears on all pages for navigation\n\n`;
  } else if (fileName.includes("footer")) {
    explanation += `Footer - The bottom part of every page.\n`;
    explanation += `This is a reusable component that appears on all pages\n\n`;
  } else {
    explanation += `What it does: This code creates an HTML page with dynamic content.\n\n`;
  }

  if (hasInclude) {
    explanation += "Page structure: Includes reusable parts like header and footer\n";
  }

  if (hasLoop) {
    explanation += "Data display: Uses loops to show lists of items (students, courses, enrollments, etc.)\n";
  }

  if (hasCondition) {
    explanation += "Conditional display: Shows or hides parts of the page based on certain conditions\n";
  }

  if (forms > 0) {
    explanation += `Forms: Contains ${forms} form(s) for users to submit data (adding/editing student, subject, or enrollment)\n`;
  }

  if (tables > 0) {
    explanation += `Data tables: Contains ${tables} table(s) displaying structured data in rows and columns\n`;
  }

  if (inputs > 0) {
    explanation += `Input fields: Has ${inputs} input field(s) where users can type or select information\n`;
  }

  if (buttons > 0) {
    explanation += `Buttons: Contains ${buttons} clickable button(s) for user actions (Save, Delete, Edit)\n`;
  }

  explanation += `\nTemplate code blocks: ${templates.length} dynamic JavaScript sections`;

  return explanation;
}

// Analyze JS file and generate explanation
function generateJsExplanation(code, fileName, filePath) {
  const requires = code.match(/require\s*\(\s*["']([^"']+)["']\s*\)/g) || [];
  const imports = code.match(/import\s+.*\s+from\s+["']([^"']+)["']/g) || [];
  const functions = code.match(/function\s+(\w+)/g) || [];
  const arrowFunctions = code.match(/const\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
  const classes = code.match(/class\s+(\w+)/g) || [];
  const exports = code.match(/module\.exports\s*=|export\s+(default|const|function|class)/g) || [];
  const asyncFuncs = (code.match(/async\s+function|const\s+\w+\s*=\s*async/g) || []).length;
  const hasDb = /sequelize|\.create|\.findAll|\.update|\.destroy|\.findByPk/i.test(code);
  const hasValidation = /validate|check|validate\(|if.*null|if.*undefined/i.test(code);
  const fileType = detectFileType(fileName, filePath);

  let explanation = ``;

  // Context-specific explanations based on file type
  if (fileType === "frontend-server") {
    explanation = `FRONTEND SERVER - Web interface that users interact with.\n\n`;
    explanation += `WHAT IS THIS FILE?\n`;
    explanation += `This is the Frontend server that:\n`;
    explanation += `- Runs on Port 3001\n`;
    explanation += `- Serves EJS web pages to users\n`;
    explanation += `- Makes API calls to the Backend\n`;
    explanation += `- Handles user interactions (clicks, form submissions)\n`;
    explanation += `- Displays data from the Backend\n\n`;

    explanation += `ARCHITECTURE - SEPARATED SERVERS:\n`;
    explanation += `This is a TRUE SEPARATED FULL-STACK ARCHITECTURE:\n\n`;
    explanation += `┌─────────────────────────────────────────────┐\n`;
    explanation += `│  FRONTEND SERVER (Port 3001)                │\n`;
    explanation += `│  File: frontend-server.js                   │\n`;
    explanation += `│  Role: Web Interface                         │\n`;
    explanation += `│  - Renders HTML pages with EJS templates    │\n`;
    explanation += `│  - Displays UI to users                     │\n`;
    explanation += `│  - Makes API requests to Backend            │\n`;
    explanation += `└─────────────────────────────────────────────┘\n`;
    explanation += `                        ↕ (Communicates via HTTP API)\n`;
    explanation += `┌─────────────────────────────────────────────┐\n`;
    explanation += `│  BACKEND SERVER (Port 3000)                 │\n`;
    explanation += `│  File: app.js                               │\n`;
    explanation += `│  Role: API & Database                       │\n`;
    explanation += `│  - Serves only API endpoints (/api/*)       │\n`;
    explanation += `│  - Handles business logic                   │\n`;
    explanation += `│  - Manages database operations              │\n`;
    explanation += `│  - Returns JSON data                        │\n`;
    explanation += `└─────────────────────────────────────────────┘\n\n`;

    explanation += `HOW FRONTEND COMMUNICATES WITH BACKEND:\n`;
    explanation += `1. User opens browser → goes to http://localhost:3001\n`;
    explanation += `2. Frontend (this server) renders EJS template\n`;
    explanation += `3. User interacts: clicks button, submits form\n`;
    explanation += `4. Frontend JavaScript makes HTTP request using axios:\n`;
    explanation += `   fetch('http://localhost:3000/api/students')\n`;
    explanation += `5. Backend (app.js) receives request on port 3000\n`;
    explanation += `6. Backend processes and queries database\n`;
    explanation += `7. Backend sends JSON response:\n`;
    explanation += `   [{id: 1, name: 'Sarah', ...}, {id: 2, ...}]\n`;
    explanation += `8. Frontend receives JSON data\n`;
    explanation += `9. Frontend updates the page with new data\n`;
    explanation += `10. User sees the updated information\n\n`;

    explanation += `FRONTEND FEATURES:\n`;
    explanation += `- Serves views (EJS templates)\n`;
    explanation += `- Handles form submissions\n`;
    explanation += `- Makes API calls to Backend\n`;
    explanation += `- Uses axios library for HTTP requests\n`;
    explanation += `- Displays data to end users\n`;
    explanation += `- Validates form input on client side\n`;
    explanation += `- Handles errors and displays messages\n\n`;

    explanation += `WHAT FRONTEND DOES NOT DO:\n`;
    explanation += `- ✗ Does NOT access database directly\n`;
    explanation += `- ✗ Does NOT perform business logic\n`;
    explanation += `- ✗ Does NOT validate data (Backend does)\n`;
    explanation += `- ✗ Does NOT serve API endpoints\n`;
    explanation += `- ✗ Does NOT know about models or Sequelize\n\n`;

    explanation += `API CALLS FROM FRONTEND:\n`;
    explanation += `GET /api/students       → Frontend requests list of students\n`;
    explanation += `POST /api/students      → Frontend submits new student\n`;
    explanation += `PUT /api/students/:id   → Frontend updates student\n`;
    explanation += `DELETE /api/students/:id  → Frontend deletes student\n`;
    explanation += `GET /api/subjects       → Frontend requests list of subjects\n`;
    explanation += `GET /api/enrollments    → Frontend requests enrollments\n`;
    explanation += `GET /api/stats          → Frontend requests dashboard stats\n\n`;

    explanation += `SERVER CONFIGURATION:\n`;
    explanation += `- Port: FRONTEND_PORT = 3001\n`;
    explanation += `- Backend URL: BACKEND_URL = http://localhost:3000\n`;
    explanation += `- View Engine: EJS (for rendering HTML templates)\n`;
    explanation += `- HTTP Client: axios (for calling Backend API)\n`;
    explanation += `- View Path: ./views (all EJS templates)\n`;
    explanation += `- Static Files: ./public (CSS, JavaScript)\n\n`;

    explanation += `RUNNING THE FRONTEND SERVER:\n`;
    explanation += `Command: node frontend-server.js\n`;
    explanation += `Or via npm: npm run frontend\n`;
    explanation += `Access at: http://localhost:3001\n`;

  } else if (fileType === "backend-api") {
    explanation = `BACKEND API SERVER - Powers the database and business logic.\n\n`;
    explanation += `WHAT IS THIS FILE?\n`;
    explanation += `This is the Backend API server that:\n`;
    explanation += `- Runs on Port 3000 (separate from Frontend)\n`;
    explanation += `- Serves ONLY JSON API endpoints (no HTML views)\n`;
    explanation += `- Handles all database operations\n`;
    explanation += `- Processes business logic\n`;
    explanation += `- Responds to Frontend API requests\n\n`;

    explanation += `ARCHITECTURE - SEPARATED SERVERS:\n`;
    explanation += `This is a TRUE SEPARATED FULL-STACK ARCHITECTURE:\n\n`;
    explanation += `┌─────────────────────────────────────────────┐\n`;
    explanation += `│  FRONTEND SERVER (Port 3001)                │\n`;
    explanation += `│  File: frontend-server.js                   │\n`;
    explanation += `│  Role: Web Interface (EJS + axios)          │\n`;
    explanation += `│  - User-facing web pages                    │\n`;
    explanation += `│  - Makes API calls to Backend               │\n`;
    explanation += `└─────────────────────────────────────────────┘\n`;
    explanation += `                        ↕ (Communicates via HTTP API)\n`;
    explanation += `┌─────────────────────────────────────────────┐\n`;
    explanation += `│  BACKEND SERVER (Port 3000) ← YOU ARE HERE  │\n`;
    explanation += `│  File: app.js                               │\n`;
    explanation += `│  Role: API & Database                       │\n`;
    explanation += `│  - API endpoints only (REST API)            │\n`;
    explanation += `│  - Database operations                      │\n`;
    explanation += `│  - Returns JSON data                        │\n`;
    explanation += `└─────────────────────────────────────────────┘\n`;
    explanation += `       ↓\n`;
    explanation += `┌─────────────────────────────────────────────┐\n`;
    explanation += `│  DATABASE (SQLite)                          │\n`;
    explanation += `│  File: database/database.sqlite             │\n`;
    explanation += `│  - Storage for all data                     │\n`;
    explanation += `│  - 3 Tables: Student, Subject, Enrollment   │\n`;
    explanation += `└─────────────────────────────────────────────┘\n\n`;

    explanation += `REQUEST-RESPONSE FLOW:\n`;
    explanation += `FRONTEND (Port 3001)          BACKEND (Port 3000)\n`;
    explanation += `────────────────────          ──────────────────\n`;
    explanation += `User action\n`;
    explanation += `  ↓\n`;
    explanation += `JavaScript makes request\n`;
    explanation += `  ↓\n`;
    explanation += `HTTP GET http://localhost:3000/api/students ────→\n`;
    explanation += `                                             ← Receives request\n`;
    explanation += `                                             ← Queries database\n`;
    explanation += `                                             ← Processes data\n`;
    explanation += `← HTTP 200 [{id:1, name:...}]  ←────────────\n`;
    explanation += `  ↓\n`;
    explanation += `JavaScript processes JSON\n`;
    explanation += `  ↓\n`;
    explanation += `Updates DOM/page display\n`;
    explanation += `  ↓\n`;
    explanation += `User sees updated information\n\n`;

    explanation += `BACKEND API ENDPOINTS:\n`;
    explanation += `Health & Stats:\n`;
    explanation += `  GET /api/health                    - Server status check\n`;
    explanation += `  GET /api/stats                     - Dashboard statistics\n\n`;

    explanation += `Student Management:\n`;
    explanation += `  GET /api/students                  - List all students\n`;
    explanation += `  GET /api/students/:id              - Get one student\n`;
    explanation += `  POST /api/students                 - Create student\n`;
    explanation += `  PUT /api/students/:id              - Update student\n`;
    explanation += `  DELETE /api/students/:id           - Delete student\n\n`;

    explanation += `Subject Management:\n`;
    explanation += `  GET /api/subjects                  - List all subjects\n`;
    explanation += `  GET /api/subjects/:id              - Get one subject\n`;
    explanation += `  POST /api/subjects                 - Create subject\n`;
    explanation += `  PUT /api/subjects/:id              - Update subject\n`;
    explanation += `  DELETE /api/subjects/:id           - Delete subject\n\n`;

    explanation += `Enrollment Management:\n`;
    explanation += `  GET /api/enrollments               - List all enrollments\n`;
    explanation += `  GET /api/enrollments/:id           - Get one enrollment\n`;
    explanation += `  POST /api/enrollments              - Create enrollment\n`;
    explanation += `  PUT /api/enrollments/:id           - Update enrollment\n`;
    explanation += `  DELETE /api/enrollments/:id        - Delete enrollment\n\n`;

    explanation += `Reports:\n`;
    explanation += `  GET /api/reports/enrollment-summary  - Get enrollment report\n\n`;

    explanation += `BACKEND FEATURES:\n`;
    explanation += `- Serves JSON API only (no HTML)\n`;
    explanation += `- Uses Sequelize ORM for database\n`;
    explanation += `- Validates all input data\n`;
    explanation += `- Handles business logic\n`;
    explanation += `- CORS enabled for Frontend communication\n`;
    explanation += `- Error handling & status codes\n`;
    explanation += `- Database relationships enforced\n\n`;

    explanation += `SERVER CONFIGURATION:\n`;
    explanation += `- Port: BACKEND_PORT = 3000\n`;
    explanation += `- CORS Origin: http://localhost:3001 (Frontend)\n`;
    explanation += `- Database: SQLite at ./database/database.sqlite\n`;
    explanation += `- ORM: Sequelize\n`;
    explanation += `- Response Format: JSON\n\n`;

    explanation += `RUNNING THE BACKEND SERVER:\n`;
    explanation += `Command: node app.js\n`;
    explanation += `Or via npm: npm run backend\n`;
    explanation += `Access API at: http://localhost:3000/api\n`;

  } else if (fileType === "model-index") {
    explanation = `DATABASE CONFIGURATION & ER DIAGRAM - The blueprint of the enrollment system.\n\n`;
    explanation += `What is this file?\n`;
    explanation += `This is the heart of the database setup. It connects all three tables and tells the application how they relate.\n\n`;

    explanation += `ENTITY RELATIONSHIP DIAGRAM (ER Diagram):\n`;
    explanation += `An ER diagram shows how different tables (entities) connect and relate to each other.\n\n`;

    explanation += `The Three Tables:\n`;
    explanation += `1. STUDENT - Stores student information (ID, Code, Name, Major)\n`;
    explanation += `2. SUBJECT - Stores course/subject information (ID, Code, Name, Credits)\n`;
    explanation += `3. ENROLLMENT - Connects students to subjects (StudentId, SubjectId, EnrollmentDate)\n\n`;

    explanation += `The Relationships:\n`;
    explanation += `ONE Student can enroll in MANY Subjects (1-to-Many relationship)\n`;
    explanation += `  Example: Student Sarah can take Math, English, and Science\n`;
    explanation += `  - Sarah (1 student) -> Math, English, Science (many subjects)\n\n`;

    explanation += `ONE Subject can have MANY Students (1-to-Many relationship)\n`;
    explanation += `  Example: Math class can have many students\n`;
    explanation += `  - Math (1 subject) -> Sarah, John, Mary (many students)\n\n`;

    explanation += `The ENROLLMENT table is the bridge connecting Students and Subjects\n`;
    explanation += `  - When Sarah enrolls in Math, an Enrollment record is created\n`;
    explanation += `  - This record says: "Sarah (studentId) -> Math (subjectId) on 2024-01-15"\n\n`;

    explanation += `Special Features:\n`;
    explanation += `- CASCADE DELETE: If a Student is deleted, all their Enrollments are automatically deleted\n`;
    explanation += `- FOREIGN KEYS: Make sure enrollment records always point to valid students/subjects\n`;
    explanation += `- DATABASE CONFIG: Uses SQLite (a lightweight database stored as a single file)\n\n`;
  } else if (fileType === "model") {
    explanation = `DATABASE MODEL - Defines table structure for the enrollment system.\n\n`;

    if (fileName === "Student.js") {
      explanation += `STUDENT TABLE\n`;
      explanation += `This file defines how student records are stored in the database.\n`;
      explanation += `Each student has: ID, Student Code, Full Name, and Major (field of study)\n`;
      explanation += `Purpose: Represents a person studying at the university\n\n`;
    } else if (fileName === "Subject.js") {
      explanation += `SUBJECT/COURSE TABLE\n`;
      explanation += `This file defines how course/subject records are stored in the database.\n`;
      explanation += `Each subject has: ID, Subject Code, Name, and Credit Units\n`;
      explanation += `Purpose: Represents a course offered by the university\n\n`;
    } else if (fileName === "Enrollment.js") {
      explanation += `ENROLLMENT TABLE\n`;
      explanation += `This file defines how enrollment records are stored in the database.\n`;
      explanation += `An enrollment connects a Student to a Subject with an enrollment date\n`;
      explanation += `Purpose: Records which students are taking which courses\n\n`;
    } else {
      explanation += `This file defines the database table structure.\n\n`;
    }

    explanation += `What a Model does:\n`;
    explanation += `- Defines column names (like: studentCode, fullName, major)\n`;
    explanation += `- Specifies data types (text, number, date)\n`;
    explanation += `- Sets up validation rules (field required, unique, not empty)\n`;
    explanation += `- Creates the connection between code and database\n\n`;
  } else if (fileType === "controller") {
    explanation = `CONTROLLER - Business logic that processes requests.\n\n`;

    if (fileName.includes("student")) {
      explanation += `STUDENT CONTROLLER\n`;
      explanation += `Handles all operations related to students: adding, viewing, editing, deleting students\n`;
    } else if (fileName.includes("subject")) {
      explanation += `SUBJECT CONTROLLER\n`;
      explanation += `Handles all operations related to courses: listing courses, adding new courses\n`;
    } else if (fileName.includes("enrollment")) {
      explanation += `ENROLLMENT CONTROLLER\n`;
      explanation += `Handles enrollment operations: enroll student in course, view enrollments\n`;
    } else if (fileName.includes("report")) {
      explanation += `REPORT CONTROLLER\n`;
      explanation += `Generates reports and analytics about enrollments and students\n`;
    }

    explanation += `\nWhat a Controller does:\n`;
    explanation += `- Receives requests from the website (GET, POST, PUT, DELETE)\n`;
    explanation += `- Validates user input for correctness\n`;
    explanation += `- Communicates with the database (using Models)\n`;
    explanation += `- Processes the data\n`;
    explanation += `- Sends back a response to the user\n`;
    explanation += `- Handles errors gracefully\n\n`;
  } else if (fileType === "routes") {
    explanation = `ROUTES - URL endpoints that map requests to controllers.\n\n`;

    if (fileName.includes("student")) {
      explanation += `STUDENT ROUTES\n`;
      explanation += `Maps URLs like: /students, /students/new, /students/:id\n`;
      explanation += `Connects them to student controller functions\n`;
    } else if (fileName.includes("subject")) {
      explanation += `SUBJECT ROUTES\n`;
      explanation += `Maps URLs for subject/course operations\n`;
    } else if (fileName.includes("enrollment")) {
      explanation += `ENROLLMENT ROUTES\n`;
      explanation += `Maps URLs for enrollment operations\n`;
    } else if (fileName.includes("report")) {
      explanation += `REPORT ROUTES\n`;
      explanation += `Maps URLs for viewing various reports\n`;
    }

    explanation += `\nWhat Routes do:\n`;
    explanation += `- Define URL paths that users can visit\n`;
    explanation += `- Connect URLs to the right controller functions\n`;
    explanation += `- Specify which HTTP method (GET, POST, PUT, DELETE)\n`;
    explanation += `- Act as the "router" directing traffic in the application\n\n`;
  } else if (fileType === "seed") {
    explanation = `SEED FILE - Initial test data for the database.\n\n`;
    explanation += `Purpose: When starting development, this file populates the database with test data.\n\n`;
    explanation += `What it does:\n`;
    explanation += `- Creates sample students (3615001, 3615002, etc.)\n`;
    explanation += `- Creates sample subjects (CS101, MATH201, etc.)\n`;
    explanation += `- Creates sample enrollments showing which students took which courses\n`;
    explanation += `- Helps developers test the system without typing data manually\n\n`;
  } else {
    explanation = `JavaScript File - Backend logic that powers the application.\n\n`;
    explanation += `What it does: This code runs on the server and handles business logic and operations.\n\n`;
  }

  const deps = requires.length + imports.length;
  if (deps > 0) {
    explanation += `Dependencies: Uses ${deps} external tool(s)/library(ies)\n`;
  }

  const funcsTotal = functions.length + arrowFunctions.length;
  if (funcsTotal > 0) {
    explanation += `Functions: Contains ${funcsTotal} reusable block(s) of code\n`;
  }

  if (classes.length > 0) {
    explanation += `Classes: Contains ${classes.length} class(es)\n`;
  }

  if (hasValidation) {
    explanation += `Validation: Checks that data is correct before saving\n`;
  }

  if (hasDb) {
    explanation += `Database: Reads from and writes to the database\n`;
  }

  if (asyncFuncs > 0) {
    explanation += `Async operations: Contains ${asyncFuncs} asynchronous operation(s) that wait for responses\n`;
  }

  return explanation;
}

// Scan folder for files with specified extensions
async function getFilesFromDirectory(inputDir, extensions) {
  try {
    const files = await fs.readdir(inputDir);

    return files
      .filter((file) => extensions.some((ext) => file.endsWith(ext)))
      .filter((file) => !EXCLUDE_FILES.has(file))
      .sort(naturalSort);
  } catch (error) {
    console.error(`Error reading directory ${inputDir}:`, error.message);
    return [];
  }
}

/* =========================
   PDF WRITER (compact + borders)
   ========================= */

function createPdfWriter(pdfDoc, font) {
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // Border segments for current block (each segment = one page part)
  let blockSegments = [];
  let blockActive = false;

  function newPage() {
    // If we are inside a block, close the segment on the old page
    if (blockActive && blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }

    // Create new page
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;

    // If we are inside a block, start a new segment on the new page
    if (blockActive) {
      blockSegments.push({
        page,
        topY: y,
        bottomY: y,
      });
    }
  }

  function ensureSpace() {
    if (y < MARGIN_BOTTOM) {
      newPage();
    }
  }

  function writeLine(text, options = {}) {
    ensureSpace();

    page.drawText(sanitize(text), {
      x: MARGIN_LEFT,
      y,
      size: options.size ?? FONT_SIZE,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });

    y -= options.lineHeight ?? LINE_HEIGHT;

    // Update border segment bottom continuously
    if (blockActive && blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }
  }

  function writeBlock(text, options = {}) {
    const lines = sanitize(text).split("\n");

    for (const line of lines) {
      const safeLine =
        line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + "..." : line;

      writeLine(safeLine, options);
    }
  }

  function startBlockBorder() {
    ensureSpace();
    blockActive = true;

    blockSegments = [
      {
        page,
        topY: y,
        bottomY: y,
      },
    ];
  }

  function finishBlockBorder() {
    if (!blockActive) return;

    // close last segment bottom
    if (blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }

    // Draw border for each segment
    for (const seg of blockSegments) {
      const boxLeft = MARGIN_LEFT - BORDER_PADDING;
      const boxRight = PAGE_WIDTH - MARGIN_RIGHT + BORDER_PADDING;
      const boxWidth = boxRight - boxLeft;

      const top = seg.topY + BORDER_PADDING;
      const bottom = seg.bottomY - BORDER_PADDING;
      const boxHeight = top - bottom;

      if (boxHeight < 10) continue;

      seg.page.drawRectangle({
        x: boxLeft,
        y: bottom,
        width: boxWidth,
        height: boxHeight,
        borderWidth: BORDER_THICKNESS,
        borderColor: rgb(0.6, 0.6, 0.6),
      });
    }

    // Reset
    blockActive = false;
    blockSegments = [];
  }

  return {
    writeLine,
    writeBlock,
    startBlockBorder,
    finishBlockBorder,
  };
}

/* =========================
   MAIN
   ========================= */

async function generatePdfForJob(job) {
  const { inputDir, outputFile, extensions } = job;
  const files = await getFilesFromDirectory(inputDir, extensions);

  if (files.length === 0) {
    console.log(`No files found in ${inputDir}`);
    return;
  }

  console.log(`\n📄 Generating ${outputFile}...`);
  console.log(`Found ${files.length} file(s) in ${inputDir}`);

  // Create PDF + font
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  // Create writer
  const writer = createPdfWriter(pdfDoc, font);

  // Write each file into PDF
  for (const fileName of files) {
    const filePath = path.join(inputDir, fileName);
    console.log("  Processing:", filePath);

    const code = await fs.readFile(filePath, "utf-8");
    const explanation = await generateFileExplanation(filePath, fileName);

    // Start bordered block for this file
    writer.startBlockBorder();

    // Header
    writer.writeLine(`FILE: ${fileName}`, {
      size: FONT_SIZE + 2,
      lineHeight: LINE_HEIGHT * 1.4,
      color: rgb(0.1, 0.1, 0.1),
    });

    writer.writeLine("");

    // Code section
    writer.writeLine("[CODE]", {
      size: FONT_SIZE + 1,
      lineHeight: LINE_HEIGHT * 1.2,
      color: rgb(0.2, 0.2, 0.2),
    });
    writer.writeBlock(code);

    writer.writeLine("");

    // Explanation section
    writer.writeLine("[EXPLANATION]", {
      size: FONT_SIZE + 1,
      lineHeight: LINE_HEIGHT * 1.2,
      color: rgb(0.2, 0.2, 0.2),
    });
    writer.writeBlock(explanation);

    writer.writeLine("");

    // Finish bordered block
    writer.finishBlockBorder();
  }

  // Save PDF
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(OUTPUT_DIR, outputFile);

  await fs.writeFile(outputPath, pdfBytes);

  console.log(`✅ Created: ${outputPath}`);
}

async function main() {
  console.log("=".repeat(50));
  console.log("PDF Generator - Processing all jobs...");
  console.log("=".repeat(50));

  for (const job of PDF_JOBS) {
    await generatePdfForJob(job);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ All PDFs generated successfully!");
  console.log("=".repeat(50));
}

main().catch(console.error);
