import React, { useState } from 'react';
import { Plus, LogOut, CheckCircle, X, Camera, Package } from 'lucide-react';

const HouseholdTracker = () => {
  const [user, setUser] = useState(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [currentTab, setCurrentTab] = useState('tasks');
  
  const [areas, setAreas] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [extensionRequests, setExtensionRequests] = useState([]);
  
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stockTakes, setStockTakes] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: 'units',
    lowStockThreshold: 5,
    reorderAlertLevel: 3
  });
  const [showStockTakeModal, setShowStockTakeModal] = useState(false);
  const [stockTakeData, setStockTakeData] = useState({});
  
  const [showNewArea, setShowNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    description: '',
    photoRequired: 'optional',
    frequency: 'daily',
    times: []
  });
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [taskPhoto, setTaskPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [showExtensionRequest, setShowExtensionRequest] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState({});
  
  const [adminCredentials, setAdminCredentials] = useState({ username: 'admin', password: 'admin123' });
  const [userCredentials, setUserCredentials] = useState({ password: 'user123' });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ adminUsername: 'admin', adminPassword: 'admin123', userPassword: 'user123' });

  // Helper functions
  const isStockTakeDue = () => {
    const today = new Date();
    const date = today.getDate();
    return (date >= 13 && date <= 15) || (date >= 27 && date <= 29);
  };

  const hasCompletedThisStockTake = () => {
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    let periodStart, periodEnd;
    if (date >= 13 && date <= 15) {
      periodStart = new Date(year, month, 13);
      periodEnd = new Date(year, month, 15);
    } else if (date >= 27 && date <= 29) {
      periodStart = new Date(year, month, 27);
      periodEnd = new Date(year, month, 29);
    } else if (date < 13) {
      const lastMonth = new Date(year, month - 1);
      periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 27);
      periodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 29);
    } else {
      periodStart = new Date(year, month, 13);
      periodEnd = new Date(year, month, 15);
    }
    
    return stockTakes.some(st => {
      const stDate = new Date(st.date);
      return stDate >= periodStart && stDate <= periodEnd;
    });
  };

  const calculateConsumption = (itemId) => {
    const itemStockTakes = stockTakes
      .filter(st => st.items[itemId])
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (itemStockTakes.length < 2) return null;
    
    const latest = itemStockTakes[itemStockTakes.length - 1];
    const previous = itemStockTakes[itemStockTakes.length - 2];
    
    const consumed = previous.items[itemId] - latest.items[itemId];
    const daysAgo = Math.floor((new Date(latest.date) - new Date(previous.date)) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return null;
    
    const dailyRate = consumed / daysAgo;
    const currentStock = latest.items[itemId];
    const daysUntilEmpty = currentStock / dailyRate;
    
    return { dailyRate, daysUntilEmpty, consumed, daysAgo };
  };

  const handleAdminLogin = () => {
    if (adminUsername === adminCredentials.username && adminPassword === adminCredentials.password) {
      setUser({ role: 'admin', username: adminUsername });
      setLoginError('');
      setAdminUsername('');
      setAdminPassword('');
    } else {
      setLoginError('Invalid admin credentials');
    }
  };

  const handleUserLogin = () => {
    if (userPassword === userCredentials.password) {
      setUser({ role: 'user', username: 'User' });
      setLoginError('');
      setUserPassword('');
    } else {
      setLoginError('Invalid user password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedTask(null);
    setShowTaskDetail(false);
    setCurrentTab('tasks');
  };

  const saveCredentials = () => {
    if (!settingsForm.adminUsername || !settingsForm.adminPassword || !settingsForm.userPassword) {
      addAlert('All fields are required', 'error');
      return;
    }
    setAdminCredentials({ username: settingsForm.adminUsername, password: settingsForm.adminPassword });
    setUserCredentials({ password: settingsForm.userPassword });
    setShowSettings(false);
    addAlert('Credentials updated successfully!', 'success');
  };

  const createArea = () => {
    if (newAreaName.trim()) {
      setAreas([...areas, { id: Date.now(), name: newAreaName }]);
      setNewAreaName('');
      setShowNewArea(false);
      addAlert('Area created successfully', 'success');
    }
  };

  const createTask = () => {
    if (newTaskData.name && selectedArea) {
      const requiresTime = ['twice-daily', 'thrice-daily', 'four-daily'].includes(newTaskData.frequency);
      if (requiresTime && newTaskData.times.some(t => !t)) {
        addAlert('Please specify all times for this frequency', 'error');
        return;
      }

      // For multiple times per day, create separate tasks for each time
      if (['twice-daily', 'thrice-daily', 'four-daily'].includes(newTaskData.frequency)) {
        newTaskData.times.forEach((time, idx) => {
          setTasks(prevTasks => [...prevTasks, {
            id: Date.now() + idx,
            areaId: selectedArea,
            name: newTaskData.name,
            description: newTaskData.description,
            photoRequired: newTaskData.photoRequired,
            frequency: newTaskData.frequency,
            time: time,
            timeIndex: idx + 1,
            dueDate: new Date().toISOString().split('T')[0]
          }]);
        });
      } else {
        // For single daily/weekly/etc, create one task
        setTasks(prevTasks => [...prevTasks, {
          id: Date.now(),
          areaId: selectedArea,
          name: newTaskData.name,
          description: newTaskData.description,
          photoRequired: newTaskData.photoRequired,
          frequency: newTaskData.frequency,
          time: newTaskData.times[0] || '',
          dueDate: new Date().toISOString().split('T')[0]
        }]);
      }

      setNewTaskData({ name: '', description: '', photoRequired: 'optional', frequency: 'daily', times: [] });
      setSelectedArea('');
      setShowNewTask(false);
      addAlert('Task created successfully', 'success');
    }
  };

  const completeTask = () => {
    if (selectedTask) {
      if (selectedTask.photoRequired === 'mandatory' && !taskPhotos[selectedTask.id]) {
        addAlert('Photo is required for this task', 'error');
        return;
      }
      setCompletedTasks([...completedTasks, { taskId: selectedTask.id, date: new Date(), photo: taskPhotos[selectedTask.id] }]);
      addAlert('Task completed!', 'success');
      setShowTaskDetail(false);
      setSelectedTask(null);
    }
  };

  const requestExtension = () => {
    if (selectedTask && extensionDate) {
      setExtensionRequests([...extensionRequests, {
        id: Date.now(),
        taskId: selectedTask.id,
        originalDate: selectedTask.dueDate,
        requestedDate: extensionDate,
        status: 'pending'
      }]);
      addAlert('Extension request sent', 'success');
      setShowExtensionRequest(false);
      setExtensionDate('');
      setShowTaskDetail(false);
    }
  };

  const approveExtension = (requestId) => {
    setExtensionRequests(extensionRequests.map(req =>
      req.id === requestId ? { ...req, status: 'approved' } : req
    ));
    addAlert('Extension approved', 'success');
  };

  const denyExtension = (requestId) => {
    setExtensionRequests(extensionRequests.map(req =>
      req.id === requestId ? { ...req, status: 'denied' } : req
    ));
    addAlert('Extension denied', 'success');
  };

  const createCategory = () => {
    if (newCategoryName.trim()) {
      setInventoryCategories([...inventoryCategories, { id: Date.now(), name: newCategoryName }]);
      setNewCategoryName('');
      setShowNewCategory(false);
      addAlert('Category created', 'success');
    }
  };

  const createInventoryItem = () => {
    if (newItemData.name && selectedCategory) {
      setInventoryItems([...inventoryItems, {
        id: Date.now(),
        categoryId: selectedCategory,
        ...newItemData
      }]);
      setNewItemData({ name: '', unit: 'units', lowStockThreshold: 5, reorderAlertLevel: 3 });
      setSelectedCategory('');
      setShowNewItem(false);
      addAlert('Item created', 'success');
    }
  };

  const deleteInventoryItem = (itemId) => {
    setInventoryItems(inventoryItems.filter(item => item.id !== itemId));
    addAlert('Item deleted', 'success');
  };

  const submitStockTake = () => {
    const hasAllItems = inventoryItems.every(item => stockTakeData[item.id] !== undefined);
    if (!hasAllItems) {
      addAlert('Please enter quantity for all items', 'error');
      return;
    }
    
    setStockTakes([...stockTakes, {
      id: Date.now(),
      date: new Date().toISOString(),
      items: { ...stockTakeData }
    }]);
    setStockTakeData({});
    setShowStockTakeModal(false);
    addAlert('Stock take submitted!', 'success');
  };

  const addAlert = (message, type) => {
    const id = Date.now();
    setAlerts([...alerts, { id, message, type }]);
    setTimeout(() => setAlerts(a => a.filter(al => al.id !== id)), 3000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      addAlert('Could not access camera', 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const now = new Date();
      const gmt8Time = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
      const timestamp = gmt8Time.toLocaleString('en-SG', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      
      context.fillStyle = 'white';
      context.font = 'bold 16px Arial';
      context.fillRect(10, canvasRef.current.height - 30, 300, 30);
      context.fillStyle = 'black';
      context.fillText(timestamp, 15, canvasRef.current.height - 10);
      
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setTaskPhotos({ ...taskPhotos, [selectedTask.id]: { name: file.name, timestamp } });
        stopCamera();
        addAlert('Photo captured!', 'success');
      }, 'image/jpeg');
    }
  };

  const getTodaysTasks = () => {
    return tasks.filter(task => {
      const isCompleted = completedTasks.some(ct => ct.taskId === task.id && 
        new Date(ct.date).toDateString() === new Date().toDateString());
      return !isCompleted;
    });
  };

  const getAreaName = (areaId) => areas.find(a => a.id === areaId)?.name || 'Unknown';
  const getCategoryName = (catId) => inventoryCategories.find(c => c.id === catId)?.name || 'Other';

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Household Tracker</h1>
            
            <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Admin Login</h2>
                <input
                  type="text"
                  placeholder="Username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAdminLogin}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Login as Admin
                </button>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">User Login</h2>
                <input
                  type="password"
                  placeholder="Password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUserLogin}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Login as User
                </button>
              </div>
            </div>

            {loginError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <div className="mt-6 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
              <p><strong>Demo Credentials:</strong></p>
              <p>Admin: {adminCredentials.username} / {adminCredentials.password}</p>
              <p>User: {userCredentials.password}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'admin') {
    const lowStockItems = inventoryItems.filter(item => {
      const lastStockTake = stockTakes
        .filter(st => st.items[item.id] !== undefined)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      if (!lastStockTake) return false;
      return lastStockTake.items[item.id] <= item.reorderAlertLevel;
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowSettings(true); setSettingsForm({ adminUsername: adminCredentials.username, adminPassword: adminCredentials.password, userPassword: userCredentials.password }); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Areas</h2>
                  <button
                    onClick={() => setShowNewArea(!showNewArea)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus size={20} /> New Area
                  </button>
                </div>

                {showNewArea && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      placeholder="Area name"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={createArea} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">Create</button>
                      <button onClick={() => setShowNewArea(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition font-semibold">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {areas.map(area => (
                    <div key={area.id} className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">{area.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Tasks</h2>
                <button onClick={() => setShowNewTask(!showNewTask)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mb-4">
                  <Plus size={20} /> New Task
                </button>

                {showNewTask && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Area</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input type="text" placeholder="Task name" value={newTaskData.name} onChange={(e) => setNewTaskData({ ...newTaskData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea placeholder="Description" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                      <select value={newTaskData.frequency} onChange={(e) => setNewTaskData({ ...newTaskData, frequency: e.target.value, times: [] })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="daily">Daily</option>
                        <option value="twice-daily">Twice a Day</option>
                        <option value="thrice-daily">3 Times a Day</option>
                        <option value="four-daily">4 Times a Day</option>
                        <option value="every-other-day">Every Other Day</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="as-needed">As Needed</option>
                      </select>
                    </div>

                    {['twice-daily', 'thrice-daily', 'four-daily'].includes(newTaskData.frequency) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Specify Times for {newTaskData.frequency === 'twice-daily' ? '2' : newTaskData.frequency === 'thrice-daily' ? '3' : '4'} Daily Tasks
                        </label>
                        <div className="space-y-2">
                          {Array(
                            newTaskData.frequency === 'twice-daily' ? 2 : 
                            newTaskData.frequency === 'thrice-daily' ? 3 : 4
                          ).fill(null).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-12">#{idx + 1}</span>
                              <input
                                type="time"
                                value={newTaskData.times[idx] || ''}
                                onChange={(e) => {
                                  const newTimes = [...newTaskData.times];
                                  newTimes[idx] = e.target.value;
                                  setNewTaskData({ ...newTaskData, times: newTimes });
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {newTaskData.frequency === 'daily' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Specify Time (Optional)</label>
                        <input
                          type="time"
                          value={newTaskData.times[0] || ''}
                          onChange={(e) => setNewTaskData({ ...newTaskData, times: [e.target.value] })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Requirement</label>
                      <select value={newTaskData.photoRequired} onChange={(e) => setNewTaskData({ ...newTaskData, photoRequired: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="optional">Optional</option>
                        <option value="mandatory">Mandatory</option>
                      </select>
                    </div>

                    {['twice-daily', 'thrice-daily', 'four-daily'].includes(newTaskData.frequency) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Times</label>
                        <div className="space-y-2">
                          {Array(newTaskData.frequency === 'twice-daily' ? 2 : newTaskData.frequency === 'thrice-daily' ? 3 : 4).fill(null).map((_, idx) => (
                            <input key={idx} type="time" value={newTaskData.times[idx] || ''} onChange={(e) => { const newTimes = [...newTaskData.times]; newTimes[idx] = e.target.value; setNewTaskData({ ...newTaskData, times: newTimes }); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={createTask} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">Create Task</button>
                      <button onClick={() => setShowNewTask(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition font-semibold">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700">{task.name}</div>
                      <div className="text-sm text-gray-500">{getAreaName(task.areaId)} • {task.frequency}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Low Stock</h2>
                <div className="space-y-2">
                  {lowStockItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">All good</p>
                  ) : (
                    lowStockItems.map(item => <div key={item.id} className="p-3 bg-red-50 rounded">{item.name}</div>)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Username</label>
                  <input type="text" value={settingsForm.adminUsername} onChange={(e) => setSettingsForm({ ...settingsForm, adminUsername: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Password</label>
                  <input type="password" value={settingsForm.adminPassword} onChange={(e) => setSettingsForm({ ...settingsForm, adminPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="border-t pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">User Password</label>
                  <input type="password" value={settingsForm.userPassword} onChange={(e) => setSettingsForm({ ...settingsForm, userPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={saveCredentials} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Save</button>
                <button onClick={() => setShowSettings(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
          {alerts.map(alert => (
            <div key={alert.id} className={`px-4 py-3 rounded-lg text-white font-semibold shadow-lg ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {alert.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (user.role === 'user') {
    const todaysTasks = getTodaysTasks();
    const stockTakeDue = isStockTakeDue();
    const completedStockTake = hasCompletedThisStockTake();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Rumah Saya</h1>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setCurrentTab('tasks')} className={`px-4 py-2 rounded font-semibold transition ${currentTab === 'tasks' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Tugas</button>
                <button onClick={() => setCurrentTab('inventory')} className={`px-4 py-2 rounded font-semibold transition ${currentTab === 'inventory' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Inventori</button>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <LogOut size={20} /> Keluar
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {currentTab === 'tasks' && (
            <>
              {todaysTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Semua selesai hari ini!</h2>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaysTasks.map(task => (
                    <div key={task.id} onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }} className="bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer p-4">
                      <h3 className="font-bold text-gray-800 mb-1">{task.name}</h3>
                      <p className="text-sm text-gray-500 mb-1">{getAreaName(task.areaId)}</p>
                      {task.time && (
                        <p className="text-sm text-blue-600 font-semibold mb-3">⏰ {task.time}</p>
                      )}
                      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Selesaikan Tugas</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {currentTab === 'inventory' && (
            <>
              {stockTakeDue && !completedStockTake && (
                <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-500 rounded-xl">
                  <h3 className="font-bold text-orange-900 mb-2">Penghitungan Stok Diperlukan!</h3>
                  <p className="text-sm text-orange-800 mb-3">Silakan selesaikan penghitungan inventori Anda hari ini.</p>
                  <button onClick={() => setShowStockTakeModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition">Mulai Penghitungan Stok</button>
                </div>
              )}

              {completedStockTake && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={24} className="text-green-600" />
                    <p className="font-semibold text-green-800">✓ Penghitungan stok selesai</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {inventoryCategories.map(cat => {
                  const catItems = inventoryItems.filter(item => item.categoryId === cat.id);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.id} className="bg-white rounded-xl shadow p-6">
                      <h3 className="font-bold text-lg text-gray-800 mb-4">{cat.name}</h3>
                      <div className="space-y-3">
                        {catItems.map(item => {
                          const lastStockTake = stockTakes.filter(st => st.items[item.id]).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                          const currentStock = lastStockTake ? lastStockTake.items[item.id] : 'Tidak ada data';
                          const isLowStock = lastStockTake && lastStockTake.items[item.id] <= item.lowStockThreshold;
                          return (
                            <div key={item.id} className={`p-4 rounded-lg border-2 ${isLowStock ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-300'}`}>
                              <h4 className="font-bold text-gray-800 mb-1">{item.name}</h4>
                              <p className="text-sm text-gray-600">Stok Saat Ini: <span className={isLowStock ? 'text-red-600 font-bold' : 'text-green-600'}>{currentStock} {item.unit}</span></p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {showTaskDetail && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedTask.name}</h2>
                <button onClick={() => setShowTaskDetail(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-gray-800">{selectedTask.description}</p>
                
                {selectedTask.photoRequired !== 'optional' && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      📷 Photo {selectedTask.photoRequired === 'mandatory' ? '(Wajib)' : '(Opsional)'}
                    </p>
                    {!taskPhotos[selectedTask.id] ? (
                      <button 
                        onClick={startCamera}
                        className="w-full flex items-center justify-center gap-2 bg-blue-100 text-blue-600 border-2 border-blue-300 rounded-lg p-4 font-semibold hover:bg-blue-50 transition"
                      >
                        <Camera size={20} /> Ambil Foto
                      </button>
                    ) : (
                      <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                        <p className="text-sm text-green-800 font-semibold mb-1">✓ Foto berhasil diambil</p>
                        <p className="text-xs text-green-700">{taskPhotos[selectedTask.id].name}</p>
                        <p className="text-xs text-green-700 mt-1">Waktu: {taskPhotos[selectedTask.id].timestamp}</p>
                        <button 
                          onClick={() => setTaskPhotos({ ...taskPhotos, [selectedTask.id]: null })}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                        >
                          Ambil Ulang
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={completeTask} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">Selesaikan</button>
                <button onClick={() => { setShowTaskDetail(false); }} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition">Tutup</button>
              </div>
            </div>
          </div>
        )}

        {showStockTakeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Penghitungan Stok</h2>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {inventoryItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Package size={24} className="text-gray-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600">Satuan: {item.unit}</p>
                    </div>
                    <input type="number" min="0" placeholder="Qty" value={stockTakeData[item.id] ?? ''} onChange={(e) => setStockTakeData({ ...stockTakeData, [item.id]: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={submitStockTake} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">Kirim</button>
                <button onClick={() => setShowStockTakeModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition">Batal</button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
          {alerts.map(alert => (
            <div key={alert.id} className={`px-4 py-3 rounded-lg text-white font-semibold shadow-lg ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {alert.message}
            </div>
          ))}
        </div>
      </div>
    );
  }
};

export default HouseholdTracker;