// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'student_management_students';

// ─── localStorage Helpers ────────────────────────────────────────────────────
/*
no changes
*/
/**
 * Retrieve all students from localStorage.
 * Guards against corrupt data with try/catch.
 * @returns {Array} Array of student objects.
 */
function getStudentsFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Persist the students array to localStorage.
 * @param {Array} students
 */
function saveStudentsToStorage(students) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

/**
 * getNextRollNumber — returns the next available roll number.
 * Keeps values unique by using the current maximum + 1.
 * @returns {number}
 */
function getNextRollNumber() {
    const students = getStudentsFromStorage();
    if (students.length === 0) return 1;

    const maxRoll = students.reduce((max, student) => {
        const roll = Number(student.rollNumber);
        return Number.isFinite(roll) && roll > max ? roll : max;
    }, 0);

    return maxRoll + 1;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * addStudent — validates input, creates a student record, and saves it.
 * @param {string} name
 * @param {number} age
 * @param {string} grade
 * @param {string} email
 * @returns {{ success: boolean, message: string, student?: object }}
 */
function addStudent(name, age, grade, email) {
    name = name.trim();
    grade = grade.trim();
    email = email.trim().toLowerCase();

    if (!name || !grade || !email) {
        return { success: false, message: 'All fields are required.' };
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 100) {
        return { success: false, message: 'Age must be a number between 1 and 100.' };
    }

    const parsedRollNumber = getNextRollNumber();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: 'Please enter a valid email address.' };
    }

    const students = getStudentsFromStorage();

    // Prevent duplicate emails
    const duplicateEmail = students.some(
        (s) => s.email.toLowerCase() === email
    );
    if (duplicateEmail) {
        return { success: false, message: 'A student with this email already exists.' };
    }

    const student = {
        id: crypto.randomUUID(),
        name,
        age: parsedAge,
        rollNumber: parsedRollNumber,
        grade,
        email,
        createdAt: new Date().toISOString(),
    };

    students.push(student);
    saveStudentsToStorage(students);

    return { success: true, message: `Student "${name}" added successfully.`, student };
}

/**
 * listStudents — returns all stored students, optionally filtered by a query.
 * @param {string} [query=''] - Filter by name or grade (case-insensitive).
 * @returns {Array} Filtered (or full) list of students.
 */
function listStudents(query = '') {
    const students = getStudentsFromStorage();
    if (!query.trim()) return students;

    const lower = query.trim().toLowerCase();
    return students.filter(
        (s) =>
            s.name.toLowerCase().includes(lower) ||
            s.grade.toLowerCase().includes(lower) ||
            s.rollNumber.toString().includes(lower)
    );
}

/**
 * deleteStudent — removes a student by id.
 * @param {string} id
 */
function deleteStudent(id) {
    const students = getStudentsFromStorage().filter((s) => s.id !== id);
    saveStudentsToStorage(students);
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function showMessage(text, type) {
    const el = document.getElementById('formMessage');
    el.textContent = text;
    el.className = `form-message ${type}`;
    setTimeout(() => {
        el.textContent = '';
        el.className = 'form-message';
    }, 3500);
}

function handleDeleteStudent(student) {
    const confirmed = window.confirm(`Delete ${student.name} from the student list?`);

    if (!confirmed) {
        return;
    }

    deleteStudent(student.id);
    renderStudentList(document.getElementById('searchInput').value);
    showMessage(`Student "${student.name}" deleted successfully.`, 'success');
}

/**
 * makeField — creates a <p>Label: <span>value</span></p> element using
 * textContent so no user data ever passes through an HTML parser.
 * @param {string} label
 * @param {string|number} value
 * @returns {HTMLParagraphElement}
 */
function makeField(label, value) {
    const p = document.createElement('p');
    p.textContent = `${label}: `;
    const span = document.createElement('span');
    span.textContent = value;
    p.appendChild(span);
    return p;
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.dataset.id = student.id;

    // Delete button — textContent keeps it safe
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete student';
    deleteBtn.setAttribute('aria-label', `Delete ${student.name}`);
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
        handleDeleteStudent(student);
    });

    // Student name heading
    const nameEl = document.createElement('h3');
    nameEl.textContent = student.name;

    const joined = new Date(student.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    // Append all elements — no innerHTML with dynamic data
    card.appendChild(deleteBtn);
    card.appendChild(nameEl);
    card.appendChild(makeField('Age', student.age));
    card.appendChild(makeField('Roll Number', student.rollNumber ?? 'N/A'));
    card.appendChild(makeField('Grade', student.grade));
    card.appendChild(makeField('Email', student.email));
    card.appendChild(makeField('Added', joined));

    return card;
}

function renderStudentList(query = '') {
    const listEl = document.getElementById('studentList');
    const emptyEl = document.getElementById('emptyMessage');
    const countEl = document.getElementById('studentCount');
    const students = listStudents(query);

    listEl.innerHTML = '';

    const allStudents = getStudentsFromStorage();
    const total = allStudents.length;
    countEl.textContent = `${total} student${total !== 1 ? 's' : ''}`;

    if (students.length === 0) {
        emptyEl.style.display = 'block';
        emptyEl.textContent = query
            ? `No students match "${query}".`
            : 'No students added yet.';
    } else {
        emptyEl.style.display = 'none';
        students.forEach((s) => listEl.appendChild(createStudentCard(s)));
    }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

document.getElementById('studentForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('studentName').value;
    const age = document.getElementById('studentAge').value;
    const grade = document.getElementById('studentGrade').value;
    const email = document.getElementById('studentEmail').value;

    const result = addStudent(name, age, grade, email);
    showMessage(result.message, result.success ? 'success' : 'error');

    if (result.success) {
        e.target.reset();
        document.getElementById('studentName').focus();
        renderStudentList(document.getElementById('searchInput').value);
    }
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderStudentList(e.target.value);
});

// ─── Init ────────────────────────────────────────────────────────────────────
renderStudentList();
