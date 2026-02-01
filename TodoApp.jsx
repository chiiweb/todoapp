import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [selectedCategory, setSelectedCategory] = useState('personal');
  const [dueDate, setDueDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef(null);

  const categories = ['personal', 'work', 'shopping', 'health', 'other'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  useEffect(() => {
    loadTodos();
    loadDarkMode();
    setupFavicon();
    
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
        }
        if (e.key === 'd') {
          e.preventDefault();
          setDarkMode(prev => !prev);
        }
        if (e.key === '/') {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setEditingId(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    saveDarkMode(darkMode);
  }, [darkMode]);

  function setupFavicon() {
    // Create dynamic favicon
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Draw checkmark circle
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 16);
    ctx.lineTo(14, 20);
    ctx.lineTo(22, 12);
    ctx.stroke();
    
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  async function loadTodos() {
    try {
      const result = await window.storage.get('todos-advanced');
      if (result && result.value) {
        setTodos(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('no saved todos yet');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTodos(newTodos) {
    try {
      await window.storage.set('todos-advanced', JSON.stringify(newTodos));
    } catch (error) {
      console.error('failed to save:', error);
    }
  }

  async function loadDarkMode() {
    try {
      const result = await window.storage.get('dark-mode');
      if (result && result.value) {
        setDarkMode(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('using default theme');
    }
  }

  async function saveDarkMode(mode) {
    try {
      await window.storage.set('dark-mode', JSON.stringify(mode));
    } catch (error) {
      console.error('failed to save theme');
    }
  }

  function addTodo(e) {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTodo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      priority: selectedPriority,
      category: selectedCategory,
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(),
      notes: ''
    };

    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
    setInputValue('');
    setDueDate('');
  }

  function toggleTodo(id) {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  }

  function deleteTodo(id) {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditText(todo.text);
  }

  function saveEdit(id) {
    if (!editText.trim()) return;
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, text: editText.trim() } : todo
    );
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
    setEditingId(null);
  }

  function clearCompleted() {
    const updatedTodos = todos.filter(todo => !todo.completed);
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
  }

  function exportTodos() {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  function importTodos(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setTodos(imported);
        saveTodos(imported);
      } catch (error) {
        alert('invalid file format');
      }
    };
    reader.readAsText(file);
  }

  function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString();
  }

  function isDueToday(date) {
    if (!date) return false;
    return new Date(date).toDateString() === new Date().toDateString();
  }

  const filteredTodos = todos
    .filter(todo => {
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      if (!showCompleted && todo.completed) return false;
      return true;
    })
    .filter(todo => {
      if (!searchQuery) return true;
      return todo.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
             todo.category.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
    overdue: todos.filter(t => !t.completed && isOverdue(t.dueDate)).length,
    dueToday: todos.filter(t => !t.completed && isDueToday(t.dueDate)).length
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };
    return colors[priority];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      personal: '👤',
      work: '💼',
      shopping: '🛒',
      health: '❤️',
      other: '📌'
    };
    return icons[category];
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="todo-wrapper">
        <header className="header">
          <div className="header-content">
            <div>
              <h1>taskmaster</h1>
              <p className="subtitle">your productivity command center</p>
            </div>
            <div className="header-actions">
              <button 
                className="icon-button" 
                onClick={() => setShowShortcuts(true)}
                title="keyboard shortcuts"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6 8H6.01M9 8H9.01M12 8H12.01M6 11H10M12 11H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button 
                className="icon-button" 
                onClick={() => setDarkMode(!darkMode)}
                title="toggle theme"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">completed</div>
          </div>
          <div className="stat-card urgent">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">overdue</div>
          </div>
          <div className="stat-card today">
            <div className="stat-value">{stats.dueToday}</div>
            <div className="stat-label">due today</div>
          </div>
        </div>

        <form onSubmit={addTodo} className="input-section">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="what needs to be done? (⌘K to focus)"
              className="todo-input"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="date-input"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="meta-inputs">
            <select 
              value={selectedPriority} 
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="select-input"
            >
              {priorities.map(p => (
                <option key={p} value={p}>{p} priority</option>
              ))}
            </select>
            
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select-input"
            >
              {categories.map(c => (
                <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>
              ))}
            </select>
            
            <button type="submit" className="add-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              add task
            </button>
          </div>
        </form>

        <div className="controls-bar">
          <div className="search-wrapper">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search tasks..."
              className="search-input"
            />
          </div>

          <div className="controls-right">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="date">sort by date</option>
              <option value="priority">sort by priority</option>
              <option value="dueDate">sort by due date</option>
            </select>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              <span>show completed</span>
            </label>
          </div>
        </div>

        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            all ({stats.total})
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            active ({stats.active})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            completed ({stats.completed})
          </button>
        </div>

        <div className="todo-list-container">
          <AnimatePresence mode="popLayout">
            {filteredTodos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="empty-state"
              >
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
                  <path d="M22 32L28 38L42 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
                </svg>
                <p>{searchQuery ? 'no tasks match your search' : filter === 'completed' ? 'no completed tasks yet' : filter === 'active' ? 'no active tasks' : 'no tasks yet. add one above!'}</p>
              </motion.div>
            ) : (
              <Reorder.Group axis="y" values={filteredTodos} onReorder={(newOrder) => {
                setTodos(newOrder);
                saveTodos(newOrder);
              }} className="todo-list">
                {filteredTodos.map((todo) => (
                  <Reorder.Item
                    key={todo.id}
                    value={todo}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${isOverdue(todo.dueDate) ? 'overdue' : ''}`}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="todo-main">
                      <label className="todo-content">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo.id)}
                          className="checkbox-input"
                        />
                        <span className="checkbox-custom">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        
                        {editingId === todo.id ? (
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => saveEdit(todo.id)}
                            onKeyPress={(e) => e.key === 'Enter' && saveEdit(todo.id)}
                            className="edit-input"
                            autoFocus
                          />
                        ) : (
                          <span className="todo-text" onDoubleClick={() => startEdit(todo)}>
                            {todo.text}
                          </span>
                        )}
                      </label>

                      <div className="todo-actions">
                        <button
                          onClick={() => startEdit(todo)}
                          className="action-button"
                          title="edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5L13.5 4.5L5.5 12.5H3.5V10.5L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="action-button delete"
                          title="delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="todo-meta">
                      <span 
                        className="priority-badge" 
                        style={{ backgroundColor: getPriorityColor(todo.priority) }}
                      >
                        {todo.priority}
                      </span>
                      <span className="category-badge">
                        {getCategoryIcon(todo.category)} {todo.category}
                      </span>
                      {todo.dueDate && (
                        <span className={`due-date ${isOverdue(todo.dueDate) ? 'overdue' : ''} ${isDueToday(todo.dueDate) ? 'today' : ''}`}>
                          📅 {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </AnimatePresence>
        </div>

        <div className="footer-section">
          {stats.completed > 0 && (
            <button onClick={clearCompleted} className="clear-button">
              clear completed ({stats.completed})
            </button>
          )}
          
          <div className="import-export">
            <button onClick={exportTodos} className="export-button">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              export
            </button>
            <label className="import-button">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 10V2M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              import
              <input type="file" accept=".json" onChange={importTodos} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="progress-text">
            {stats.completed} of {stats.total} tasks completed ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcuts(false)}
            />
            <motion.div 
              className="shortcuts-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <h2>keyboard shortcuts</h2>
              <div className="shortcuts-list">
                <div className="shortcut">
                  <kbd>⌘/Ctrl + K</kbd>
                  <span>focus input</span>
                </div>
                <div className="shortcut">
                  <kbd>⌘/Ctrl + D</kbd>
                  <span>toggle dark mode</span>
                </div>
                <div className="shortcut">
                  <kbd>⌘/Ctrl + /</kbd>
                  <span>show shortcuts</span>
                </div>
                <div className="shortcut">
                  <kbd>Enter</kbd>
                  <span>add task</span>
                </div>
                <div className="shortcut">
                  <kbd>Double Click</kbd>
                  <span>edit task</span>
                </div>
                <div className="shortcut">
                  <kbd>Drag & Drop</kbd>
                  <span>reorder tasks</span>
                </div>
                <div className="shortcut">
                  <kbd>Esc</kbd>
                  <span>close modal</span>
                </div>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="close-modal">
                close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        :root {
          --bg-primary: #f5f7fa;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f8fafc;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-tertiary: #94a3b8;
          --border-color: #e0e7ef;
          --accent-primary: #667eea;
          --accent-secondary: #764ba2;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05);
          --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.05);
        }

        [data-theme="dark"] {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-tertiary: #94a3b8;
          --border-color: #334155;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
          --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        * {
          box-sizing: border-box;
        }

        .app-container {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          transition: background 0.3s ease;
        }

        .loading-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
        }

        .loader {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .todo-wrapper {
          max-width: 800px;
          margin: 0 auto;
          background: var(--bg-secondary);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .header {
          padding: 32px 32px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 15px;
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .icon-button {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 18px;
        }

        .icon-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 24px 32px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
        }

        .stat-card {
          text-align: center;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 10px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stat-card.urgent {
          border-color: #ef4444;
        }

        .stat-card.today {
          border-color: #f59e0b;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-section {
          padding: 24px 32px;
          border-bottom: 1px solid var(--border-color);
        }

        .input-wrapper {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .todo-input {
          flex: 1;
          padding: 14px 18px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.2s;
          outline: none;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .todo-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .date-input {
          padding: 14px 18px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 15px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
        }

        .meta-inputs {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .select-input {
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-input:hover {
          border-color: var(--accent-primary);
        }

        .add-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .add-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .controls-bar {
          display: flex;
          gap: 16px;
          padding: 16px 32px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          align-items: center;
        }

        .search-wrapper {
          flex: 1;
          min-width: 200px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-wrapper svg {
          position: absolute;
          left: 12px;
          color: var(--text-tertiary);
        }

        .search-input {
          width: 100%;
          padding: 10px 10px 10px 36px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
        }

        .search-input:focus {
          border-color: var(--accent-primary);
        }

        .controls-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .sort-select {
          padding: 10px 14px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
        }

        .toggle-label input {
          cursor: pointer;
        }

        .filters {
          display: flex;
          gap: 8px;
          padding: 16px 32px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
        }

        .filter-btn {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .filter-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .todo-list-container {
          min-height: 300px;
          max-height: 500px;
          overflow-y: auto;
        }

        .empty-state {
          padding: 80px 32px;
          text-align: center;
          color: var(--text-tertiary);
        }

        .empty-state svg {
          margin-bottom: 16px;
          color: var(--text-tertiary);
        }

        .empty-state p {
          margin: 0;
          font-size: 15px;
        }

        .todo-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .todo-item {
          padding: 16px 32px;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.2s;
          cursor: grab;
        }

        .todo-item:active {
          cursor: grabbing;
        }

        .todo-item:hover {
          background: var(--bg-tertiary);
        }

        .todo-item.overdue {
          border-left: 4px solid #ef4444;
        }

        .todo-item.completed .todo-text {
          color: var(--text-tertiary);
          text-decoration: line-through;
        }

        .todo-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .todo-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .checkbox-custom {
          width: 22px;
          height: 22px;
          border: 2px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .checkbox-input:checked + .checkbox-custom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
        }

        .checkbox-custom svg {
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.2s;
        }

        .checkbox-input:checked + .checkbox-custom svg {
          opacity: 1;
          transform: scale(1);
        }

        .todo-text {
          font-size: 15px;
          color: var(--text-primary);
          line-height: 1.5;
          flex: 1;
        }

        .edit-input {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid var(--accent-primary);
          border-radius: 6px;
          font-size: 15px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
        }

        .todo-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .todo-item:hover .todo-actions {
          opacity: 1;
        }

        .action-button {
          padding: 6px;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        .action-button.delete:hover {
          color: #ef4444;
        }

        .todo-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-left: 34px;
        }

        .priority-badge,
        .category-badge,
        .due-date {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .priority-badge {
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category-badge {
          background: var(--accent-primary);
        }

        .due-date {
          background: #64748b;
        }

        .due-date.overdue {
          background: #ef4444;
        }

        .due-date.today {
          background: #f59e0b;
        }

        .footer-section {
          padding: 16px 32px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .clear-button {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .import-export {
          display: flex;
          gap: 8px;
        }

        .export-button,
        .import-button {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .export-button:hover,
        .import-button:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .progress-section {
          padding: 24px 32px 32px;
        }

        .progress-bar {
          height: 8px;
          background: var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
        }

        .progress-text {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .shortcuts-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--bg-secondary);
          padding: 32px;
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          z-index: 101;
          max-width: 500px;
          width: 90%;
        }

        .shortcuts-modal h2 {
          margin: 0 0 24px 0;
          font-size: 24px;
          color: var(--text-primary);
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .shortcut {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .shortcut kbd {
          background: var(--bg-tertiary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-family: 'SF Mono', Monaco, monospace;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .shortcut span {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .close-modal {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-modal:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 20px 12px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .header {
            padding: 24px 20px;
          }

          .input-section {
            padding: 20px;
          }

          .controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .controls-right {
            flex-direction: column;
            align-items: stretch;
          }

          .todo-item {
            padding: 14px 20px;
          }

          .footer-section {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
