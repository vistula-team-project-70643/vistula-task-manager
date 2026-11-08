let config = {};
let editingTaskId = null;
let editingTaskCompleted = false;

const statusMessage = document.getElementById('status-message');
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescriptionInput = document.getElementById('task-description');
const taskSubmitBtn = document.getElementById('task-submit');
const taskList = document.getElementById('task-list');

function showStatus(msg, isError = false) {
  statusMessage.textContent = msg;
  statusMessage.style.color = isError ? '#b00020' : '#006400';
}

async function init() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error('Failed to load config.json');
    config = await res.json();
    await loadTasks();
  } catch (err) {
    showStatus('Error initializing application: ' + err.message, true);
  }
}

function getHeaders() {
  return {
    'apikey': config.supabasePublishableKey,
    'Authorization': `Bearer ${config.supabasePublishableKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function getBaseUrl() {
  return `${config.supabaseUrl}/rest/v1/${config.tableName}`;
}

async function loadTasks() {
  try {
    const res = await fetch(`${getBaseUrl()}?select=*&order=id.asc`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    showStatus('Failed to load tasks: ' + err.message, true);
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.setAttribute('data-id', task.id);

    const titleEl = document.createElement('div');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;

    const descEl = document.createElement('div');
    descEl.className = 'task-description';
    descEl.textContent = task.description || '';

    const statusEl = document.createElement('div');
    statusEl.className = 'task-status';
    statusEl.textContent = task.completed ? 'Completed' : 'Incomplete';

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-task';
    toggleBtn.textContent = task.completed ? 'Mark Incomplete' : 'Mark Completed';
    toggleBtn.onclick = () => toggleTask(task);

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-task';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => startEditTask(task);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-task';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteTask(task.id);

    actions.append(toggleBtn, editBtn, deleteBtn);
    item.append(titleEl, descEl, statusEl, actions);
    taskList.appendChild(item);
  });
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const description = taskDescriptionInput.value.trim();

  if (!title) {
    showStatus('Task title is required.', true);
    return;
  }

  try {
    if (editingTaskId !== null) {
      const res = await fetch(`${getBaseUrl()}?id=eq.${editingTaskId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          id: editingTaskId,
          title,
          description,
          completed: editingTaskCompleted
        })
      });
      if (!res.ok) throw new Error(`Failed to update task (HTTP ${res.status})`);
      editingTaskId = null;
      editingTaskCompleted = false;
      taskSubmitBtn.textContent = 'Save Task';
      showStatus('Task updated successfully.');
    } else {
      const res = await fetch(getBaseUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title,
          description,
          completed: false
        })
      });
      if (!res.ok) throw new Error(`Failed to create task (HTTP ${res.status})`);
      showStatus('Task added successfully.');
    }

    taskForm.reset();
    await loadTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
});

function startEditTask(task) {
  editingTaskId = task.id;
  editingTaskCompleted = Boolean(task.completed);
  taskTitleInput.value = task.title;
  taskDescriptionInput.value = task.description || '';
  taskSubmitBtn.textContent = 'Update Task';
  taskTitleInput.focus();
}

async function toggleTask(task) {
  try {
    const res = await fetch(`${getBaseUrl()}?id=eq.${task.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: !task.completed
      })
    });
    if (!res.ok) throw new Error(`Failed to update status (HTTP ${res.status})`);
    showStatus('Task status updated.');
    await loadTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${getBaseUrl()}?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`Failed to delete task (HTTP ${res.status})`);
    showStatus('Task deleted.');
    await loadTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
}

init();
