// script.js (V8.25 - 终极修复，干净无错版)
document.addEventListener('DOMContentLoaded', () => {

    // --- IndexedDB 数据库助手 ---
    const db = {
        _db: null,
        init: function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('AIChatAppDB', 1);
                request.onerror = (event) => reject("数据库打开失败: " + event.target.errorCode);
                request.onsuccess = (event) => {
                    this._db = event.target.result;
                    console.log("数据库初始化成功");
                    resolve();
                };
                request.onupgradeneeded = (event) => {
                    const dbInstance = event.target.result;
                    if (!dbInstance.objectStoreNames.contains('images')) {
                        dbInstance.createObjectStore('images');
                    }
                };
            });
        },
        saveImage: function(key, blob) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("数据库未初始化");
                const transaction = this._db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                const request = store.put(blob, key);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject("图片保存失败: " + event.target.errorCode);
            });
        },
        getImage: function(key) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("数据库未初始化");
                const transaction = this._db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.get(key);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject("图片读取失败: " + event.target.errorCode);
            });
        }
    };

    // --- 1. 全局数据存储 ---
    let appData = {};
    let activeChatContactId = null;
    let lastReceivedSuggestions = [];
    let stagedUserMessages = [];
    let imageUploadMode = 'upload'; // 'upload' (真上传) 或 'simulate' (模拟)
    let stagedImageData = null; // 用于暂存图片的 base64 数据
    let isSelectMode = false;
    let selectedMessages = new Set();
    let longPressTimer;
    let lastRenderedTimestamp = 0;
    let loadingBubbleElement = null;

    // --- 2. 元素获取 ---
    const appContainer = document.getElementById('app-container');
    const appNav = document.getElementById('app-nav');
    const views = document.querySelectorAll('.view');
    const navButtons = document.querySelectorAll('.nav-button');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const addContactButton = document.getElementById('add-contact-button');
    const chatListContainer = document.getElementById('chat-list-container');
    const backToListButton = document.getElementById('back-to-list-button');
    const backFromMomentsBtn = document.getElementById('back-to-list-from-moments');
    const backFromSettingsBtn = document.getElementById('back-to-list-from-settings');
    const chatAiName = document.getElementById('chat-ai-name');
    const chatAiStatus = document.getElementById('chat-ai-status');
    const chatHeaderInfo = document.getElementById('chat-header-info');
    const chatSettingsButton = document.getElementById('chat-settings-button');
    const messageContainer = document.getElementById('message-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const voiceBtn = document.getElementById('voice-btn');
    const imageBtn = document.getElementById('image-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const redPacketBtn = document.getElementById('red-packet-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const aiHelperButton = document.getElementById('ai-helper-button');
    const moreFunctionsButton = document.getElementById('more-functions-button');
    const aiSuggestionPanel = document.getElementById('ai-suggestion-panel');
    const apiTypeSelect = document.getElementById('api-type-select');
    const apiUrlInput = document.getElementById('api-url-input');
    const apiModelSelect = document.getElementById('api-model-select');
    const fetchModelsButton = document.getElementById('fetch-models-button');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const userProfileModal = document.getElementById('user-profile-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const saveProfileButton = document.getElementById('save-profile-button');
    const modalUserNameInput = document.getElementById('modal-user-name-input');
    const modalUserPersonaInput = document.getElementById('modal-user-persona-input');
    const userAvatarUploadArea = document.getElementById('user-avatar-upload-area');
    const userAvatarPreview = document.getElementById('user-avatar-preview');
    const userAvatarUploadInput = document.getElementById('user-avatar-upload-input');
    const chatHeaderNormal = document.getElementById('chat-header-normal');
    const chatHeaderSelect = document.getElementById('chat-header-select');
    const cancelSelectButton = document.getElementById('cancel-select-button');
    const selectCount = document.getElementById('select-count');
    const editSelectedButton = document.getElementById('edit-selected-button');
    const deleteSelectedButton = document.getElementById('delete-selected-button');
    const contactSettingsView = document.getElementById('contact-settings-view');
    const backToChatButton = document.getElementById('back-to-chat-button');
    const csContactAvatar = document.getElementById('cs-contact-avatar');
    const csContactName = document.getElementById('cs-contact-name');
    const csEditAiProfile = document.getElementById('cs-edit-ai-profile');
    const csPinToggle = document.getElementById('cs-pin-toggle');
    const csClearHistory = document.getElementById('cs-clear-history');
    const aiEditorView = document.getElementById('ai-editor-view');
    const backToContactSettingsButton = document.getElementById('back-to-contact-settings-button');
    const avatarUploadArea = document.getElementById('avatar-upload-area');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const photoUploadArea = document.getElementById('photo-upload-area');
    const photoPreview = document.getElementById('photo-preview');
    const photoUploadInput = document.getElementById('photo-upload-input');
    const aiEditorName = document.getElementById('ai-editor-name');
    const aiEditorRemark = document.getElementById('ai-editor-remark');
    const aiEditorPersona = document.getElementById('ai-editor-persona');
    const aiEditorMemory = document.getElementById('ai-editor-memory');
    const aiEditorWorldbook = document.getElementById('ai-editor-worldbook');
    const addWorldbookEntryButton = document.getElementById('add-worldbook-entry-button');
    const saveAiProfileButton = document.getElementById('save-ai-profile-button');
    const voiceInputModal = document.getElementById('voice-input-modal');
    const voiceTextInput = document.getElementById('voice-text-input');
    const cancelVoiceButton = document.getElementById('cancel-voice-button');
    const confirmVoiceButton = document.getElementById('confirm-voice-button');
    const aiImageModal = document.getElementById('ai-image-modal');
    const aiImageDescriptionText = document.getElementById('ai-image-description-text');
    const closeAiImageModalButton = document.getElementById('close-ai-image-modal-button');
    const imageUploadModal = document.getElementById('image-upload-modal');
    const imageUploadTitle = document.getElementById('image-upload-title');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const userImageUploadArea = document.getElementById('user-image-upload-area');
    const userImagePreview = document.getElementById('user-image-preview');
    const userImageUploadInput = document.getElementById('user-image-upload-input');
    const imageDescriptionInput = document.getElementById('image-description-input');
    const cancelImageUploadButton = document.getElementById('cancel-image-upload-button');
    const confirmImageUploadButton = document.getElementById('confirm-image-upload-button');
    const contextLimitInput = document.getElementById('context-limit-input');


    // --- 3. 核心功能 ---
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    function formatMessageTimestamp(ts) {
    const date = new Date(ts);
    const now = new Date();
    
    // 获取今天和昨天的起始时间
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // 判断是上午、下午还是晚上
    let timePeriod = '';
    if (hours < 12) timePeriod = '上午';
    else if (hours < 18) timePeriod = '下午';
    else timePeriod = '晚上';

    // 将24小时制转为12小时制用于显示
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    const timeStr = `${timePeriod} ${hours}:${minutes}`;

    if (date >= today) {
        return timeStr; // 如果是今天，只显示时间
    } else if (date >= yesterday) {
        return `昨天 ${timeStr}`; // 如果是昨天
    } else {
        // 更早的消息，显示完整日期和时间
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${minutes}`;
    }
}
    function openAiImageModal(description) {
        // AI返回的描述里可能有换行符 \n，我们把它替换成HTML的换行标签 <br>
        aiImageDescriptionText.innerHTML = description.replace(/\n/g, '<br>');
        aiImageModal.classList.remove('hidden');
    }

    // 关闭 AI 图片描述弹窗
    function closeAiImageModal() {
        aiImageModal.classList.add('hidden');
    }
// 打开用户上传/模拟图片弹窗
    function openImageUploadModal(mode) {
        imageUploadMode = mode;
        stagedImageData = null; 
        imageDescriptionInput.value = ''; 
        userImagePreview.src = ''; 
        userImageUploadInput.value = null; 
        
        const descriptionGroup = document.getElementById('image-description-group');

        if (mode === 'upload') {
            imageUploadTitle.textContent = '发送图片';
            imagePreviewArea.style.display = 'block';
            descriptionGroup.style.display = 'none'; 
        } else { // mode === 'simulate'
            imageUploadTitle.textContent = '发送照片';
            imagePreviewArea.style.display = 'none';
            descriptionGroup.style.display = 'block'; 
            // 修改点: 下面这两行已被删除，因为对应的 HTML 元素已经不存在了
            imageDescriptionInput.placeholder = '例如：一张德牧小狗的照片，它正好奇地看着镜头...';
        }
        imageUploadModal.classList.remove('hidden');
    }

    // 关闭用户上传/模拟图片弹窗
    function closeImageUploadModal() {
        imageUploadModal.classList.add('hidden');
    }
    
    // 当用户选择了图片文件后，进行预览
    function handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            stagedImageData = e.target.result; // 读取为 base64 格式
            userImagePreview.src = stagedImageData;
        };
        reader.readAsDataURL(file);
    }
    
    // 用户点击弹窗的“发送”按钮
    function sendImageMessage() {
        const description = imageDescriptionInput.value.trim();
        
        if (imageUploadMode === 'upload') {
            if (!stagedImageData) {
                alert('请先选择一张图片！');
                return;
            }
            // 对于真实图片，描述是可选的
            const message = {
                type: 'image',
                content: description || '图片', // 如果用户没输入，给个默认文字
                imageData: stagedImageData // 关键：附带图片数据
            };
            stagedUserMessages.push(message);
            displayMessage(message.content, 'user', { isStaged: true, type: 'image', imageData: message.imageData });

        } else { // 'simulate' 模式
            if (!description) {
                alert('请填写图片描述！');
                return;
            }
            // 对于模拟图片，描述就是内容，没有图片数据
            const message = {
                type: 'image',
                content: description,
                imageData: null // 没有真实图片
            };
            stagedUserMessages.push(message);
            // 注意：模拟图片我们也用 'image' 类型，但 imageData 为 null
            // displayMessage 会根据 imageData 是否存在来决定如何显示
            displayMessage(message.content, 'user', { isStaged: true, type: 'image', imageData: null });
        }
        
        closeImageUploadModal();
    }

    async function initialize() {
        await db.init();
        loadAppData();
        await renderChatList();
        renderSettingsUI();
        await renderCurrentUserUI();
        bindEventListeners();
        switchToView('chat-list-view');
    }
    
    function loadAppData() {
        const savedData = localStorage.getItem('myAiChatApp_V8_Data');
        if (savedData) { 
            appData = JSON.parse(savedData); 
            if (!appData.currentUser) {
                appData.currentUser = { name: '你', persona: '我是一个充满好奇心的人。' };
            }
        } else {
             appData = {
                currentUser: { name: '你', persona: '我是一个充满好奇心的人。' },
                aiContacts: [], 
                appSettings: { apiType: 'openai_proxy', apiUrl: '', apiKey: '', apiModel: '' }
            };
        }
        if (!appData.appSettings) { appData.appSettings = { apiType: 'openai_proxy', apiUrl: '', apiKey: '', apiModel: '', contextLimit: 20 }; }
        // 同时，确保老用户也有默认值
        if (appData.appSettings.contextLimit === undefined) {
            appData.appSettings.contextLimit = 50; // 默认记忆50条
        }
        if (!appData.aiContacts) { appData.aiContacts = []; }

        appData.aiContacts.forEach(c => {
            if (!c.remark) c.remark = c.name;
            if (c.isPinned === undefined) c.isPinned = false;
        });
        saveAppData();
    }

    function saveAppData() {
        localStorage.setItem('myAiChatApp_V8_Data', JSON.stringify(appData));
    }
    
    function switchToView(viewId) {
        views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        if (viewId === 'chat-list-view') {
            appNav.classList.remove('hidden');
            appContainer.style.paddingBottom = '50px';
        } else {
            appNav.classList.add('hidden');
            appContainer.style.paddingBottom = '0px';
        }
        navButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.view === viewId);
        });
    }

    async function renderChatList() {
        chatListContainer.innerHTML = '';
        if (!appData.aiContacts || appData.aiContacts.length === 0) { 
            chatListContainer.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">点击右上角+号添加AI联系人</p>';
            return; 
        }
        const sortedContacts = [...appData.aiContacts].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        for (const contact of sortedContacts) {
            const avatarBlob = await db.getImage(`${contact.id}_avatar`);
            const avatarUrl = avatarBlob ? URL.createObjectURL(avatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';
            const lastMessage = contact.chatHistory[contact.chatHistory.length - 1] || { content: '...' };
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            if (contact.isPinned) {
                item.classList.add('pinned');
            }
            item.dataset.contactId = contact.id;
            item.innerHTML = `<img class="avatar" src="${avatarUrl}" alt="avatar"><div class="chat-list-item-info"><div class="chat-list-item-top"><span class="chat-list-item-name">${contact.remark}</span><span class="chat-list-item-time">昨天</span></div><div class="chat-list-item-msg">${lastMessage.content}</div></div>`;
            item.addEventListener('click', () => openChat(contact.id));
            chatListContainer.appendChild(item);
        }
    }
    
    function renderSettingsUI() {
        const settings = appData.appSettings;
        apiTypeSelect.value = settings.apiType;
        apiUrlInput.value = settings.apiUrl;
        apiKeyInput.value = settings.apiKey;
        if (settings.apiModel) {
            apiModelSelect.innerHTML = `<option value="${settings.apiModel}">${settings.apiModel}</option>`;
        } else {
            apiModelSelect.innerHTML = '';
        }
        updateSettingsUI();
        contextLimitInput.value = settings.contextLimit;
    }

    function updateSettingsUI() {
        const modelArea = document.getElementById('model-area');
        modelArea.style.display = apiTypeSelect.value === 'gemini_direct' ? 'none' : 'block';
    }

    async function renderCurrentUserUI() {
        const userAvatarBlob = await db.getImage('user_avatar');
        const userAvatarUrl = userAvatarBlob ? URL.createObjectURL(userAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        currentUserAvatar.src = userAvatarUrl;
    }

    async function openChat(contactId) {
        activeChatContactId = contactId;
        exitSelectMode();
        lastReceivedSuggestions = [];
        stagedUserMessages = [];
        lastRenderedTimestamp = 0;
        aiSuggestionPanel.classList.add('hidden'); 
        const contact = appData.aiContacts.find(c => c.id === contactId);
        if (!contact) return;
        
        const avatarBlob = await db.getImage(`${contact.id}_avatar`);
        contact.avatarUrl = avatarBlob ? URL.createObjectURL(avatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';

        const userAvatarBlob = await db.getImage('user_avatar');
        appData.currentUser.avatarUrl = userAvatarBlob ? URL.createObjectURL(userAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        
        chatAiName.textContent = contact.remark;
        messageContainer.innerHTML = '';
        contact.chatHistory.forEach((msg, index) => {
            msg.id = msg.id || `${Date.now()}-${index}`;
            // --- 核心修复！我们把历史消息的所有属性 (...msg) 都传递过去 ---
            displayMessage(msg.content, msg.role, { isNew: false, ...msg });
        });
        
        switchToView('chat-window-view');
    }
    
    function displayMessage(text, role, options = {}) {
        const { isNew = false, isLoading = false, type = 'text', isStaged = false, id = null, timestamp = null, imageData = null } = options;
        
        const messageId = id || `${Date.now()}-${Math.random()}`;
        const currentTimestamp = timestamp || Date.now();
        const TIME_GAP = 3 * 60 * 1000;

        if (!isStaged && !isLoading && (lastRenderedTimestamp === 0 || currentTimestamp - lastRenderedTimestamp > TIME_GAP)) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'timestamp-display';
            timestampDiv.textContent = formatMessageTimestamp(currentTimestamp);
            messageContainer.appendChild(timestampDiv);
        }
        
        if (!isStaged && !isLoading) {
            lastRenderedTimestamp = currentTimestamp;
        }

        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${role}-row`;
        messageRow.dataset.messageId = messageId;
        messageRow.dataset.role = role;

        if (isLoading && role === 'assistant') {
            loadingBubbleElement = messageRow;
        }
        if (isStaged) {
            messageRow.dataset.staged = 'true';
        }

        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        const avatarUrl = role === 'user' ? appData.currentUser.avatarUrl : (contact ? contact.avatarUrl : '');

        let messageContentHTML;
        switch(type) {
            case 'image':
                if (role === 'user') {
                    if (imageData) {
                        messageContentHTML = `<div class="message message-image-user"><img src="${imageData}" alt="${text}"></div>`;
                    } else {
                        messageContentHTML = `<div class="message">🖼️ [图片] ${text}</div>`;
                    }
                } else { // AI 发送的图片 (新样式)
                    // --- 核心修复1：改用 data-description 属性来安全地存储描述文本 ---
                    const escapedDescription = text.replace(/"/g, '&quot;');
                    messageContentHTML = `
                        <div class="message message-image-ai-direct" data-description="${escapedDescription}">
                            <img src="https://i.postimg.cc/vTdmV48q/a31b84cf45ff18f18b320470292a02c8.jpg" alt="AI生成的图片">
                        </div>`;
                }
                break;
            case 'voice':
                const duration = Math.max(1, Math.round(text.length / 4));
                let waveBarsHTML = Array.from({length: 15}, () => `<div class="wave-bar" style="height: ${Math.random() * 80 + 20}%;"></div>`).join('');
                messageContentHTML = `
                    <div class="message message-voice">
                        <div class="play-icon-container">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                        </div>
                        <div class="sound-wave">${waveBarsHTML}</div>
                        <span class="voice-duration">${duration}"</span>
                    </div>
                    <div class="voice-text-content">${text}</div>
                `;
                break;
            case 'red-packet': 
                messageContentHTML = `<div class="message message-red-packet">🧧 ${text}</div>`; 
                break;
            default: 
                messageContentHTML = `<div class="message">${text}</div>`;
        }
        
        messageRow.innerHTML = `
            <div class="select-checkbox hidden"></div>
            <img class="avatar" src="${avatarUrl}">
            <div class="message-content">${messageContentHTML}</div>
        `;
        
        addSelectListeners(messageRow);
        
        if (type === 'voice') {
            const voiceBubble = messageRow.querySelector('.message-voice');
            const voiceTextContent = messageRow.querySelector('.voice-text-content');
            
            setTimeout(() => voiceBubble.classList.add('playing'), 100);
            
            voiceBubble.addEventListener('click', () => {
                const isHidden = voiceTextContent.style.display === 'none' || voiceTextContent.style.display === '';
                voiceTextContent.style.display = isHidden ? 'block' : 'none';
            });
        }
        
        messageContainer.appendChild(messageRow);

        // --- 核心修复2：在这里动态添加点击事件，而不是写在HTML里 ---
        const aiImageBubble = messageRow.querySelector('.message-image-ai-direct');
        if (aiImageBubble) {
            aiImageBubble.addEventListener('click', () => {
                // 从 data-description 属性安全地取回描述文本
                const description = aiImageBubble.dataset.description;
                openAiImageModal(description);
            });
        }
        
        if (!isLoading) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        if (isNew && !isLoading && !isStaged && contact) {
            contact.chatHistory.push({ id: messageId, role, content: text, type, timestamp: currentTimestamp, imageData: imageData });
            saveAppData();
            renderChatList();
        }
    }

    function removeLoadingBubble() {
        if (loadingBubbleElement && loadingBubbleElement.parentNode) {
            loadingBubbleElement.remove();
        }
        loadingBubbleElement = null;
    }
    
    function stageUserMessage() {
        const text = chatInput.value.trim();
        if (text === '') return;
        stagedUserMessages.push({ content: text, type: 'text' });
        displayMessage(text, 'user', { isStaged: true, type: 'text' });
        chatInput.value = '';
    }

    function commitAndSendStagedMessages() {
        if (chatInput.value.trim() !== '') {
            stageUserMessage();
        }
        if (stagedUserMessages.length === 0) return;
        document.querySelectorAll('[data-staged="true"]').forEach(el => el.remove());
        stagedUserMessages.forEach(msg => {
            // 修复！我们把暂存消息的所有属性（...msg）都传递过去
            // 这样无论是 type 还是 imageData 都不会丢失了
            displayMessage(msg.content, 'user', { isNew: true, ...msg });
        });
        stagedUserMessages = [];
        getAiResponse();
    }
    
    async function getAiResponse() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        
        removeLoadingBubble();
        lastReceivedSuggestions = [];
        aiSuggestionPanel.classList.add('hidden');
        displayMessage('对方正在输入...', 'assistant', { isLoading: true });
        
        const worldBookString = (contact.worldBook && contact.worldBook.length > 0)
            ? contact.worldBook.map(entry => `- ${entry.key}: ${entry.value}`).join('\n')
            : '无';
        
        // --- 核心改造开始：构建支持图片的消息历史 ---
        const contextLimit = appData.appSettings.contextLimit || 50; // 从设置中读取条数
        const recentHistory = contact.chatHistory.slice(-contextLimit); // 使用设置的条数
        const messagesForApi = recentHistory.map(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            
            // 如果是用户的图片消息，并且有真实的图片数据
            if (msg.role === 'user' && msg.type === 'image' && msg.imageData) {
                return {
                    role: role,
                    content: [
                        { type: "text", text: msg.content },
                        { type: "image_url", image_url: { url: msg.imageData } }
                    ]
                };
            }
            
            // 其他所有普通消息 (文字、语音、模拟图片等)
            return {
                role: role,
                content: `${msg.type === 'voice' ? '[语音]' : ''}${msg.content}`
            };
        });
        
        // --- Prompt 大升级：告诉 AI 它现在能看图和发图了 ---
        const finalPrompt = `# 你的双重任务
## 任务1: 扮演AI助手
- 你的名字是"${contact.name}"，人设(包括记忆)是：${contact.persona}\n\n${contact.memory}
- **重要背景**: 你正在通过聊天软件与用户【线上对话】。当前时间: ${new Date().toLocaleString('zh-CN')}。
- **行为准则1**: 你的回复必须模拟真实聊天，将一个完整的思想拆分成【一句或多句】独立的短消息。
- **行为准则2**: 【绝对不能】包含任何括号内的动作、神态描写。
- **行为准则3 (新)**: 如果用户的消息包含图片，你【必须】先针对图片内容进行回应，然后再进行其他对话。
- **行为准则4 (新)**: 你可以发送【图片】。如果你想发图片，请使用格式 \`[IMAGE: 这是图片的详细文字描述]\` 来单独发送它。例如：\`[IMAGE: 一只可爱的金色小猫懒洋
懒地躺在洒满阳光的窗台上。]\`
- **行为准则5 (新)**: 你可以像真人一样发送【语音消息】。如果你的某条回复更适合用语音表达（例如：唱歌、叹气、笑声、语气词），请在回复前加上 \`[voice]\` 标签。例如： \`[voice]嗯...让我想想。\`
- 附加设定(世界书)：${worldBookString}
- 请根据对话历史，回应用户。

## 任务2: 生成【恋爱导向型】回复建议
- 根据你的回复，为用户（人设：${appData.currentUser.persona}）生成4条【风格各异】的建议。
- **建议1 & 2 (温和正面)**: 设计两条【温和或积极】的回答。其中一条【必须】是你最期望听到的、能让关系升温的回答。
- **建议3 (中立探索)**: 设计一条【中立或疑问】的回答。
- **建议4 (挑战/负面)**: 设计一条【带有挑战性或负面情绪】的回答，但要符合恋爱逻辑。

# 输出格式要求
你的回复【必须】是一个能被JSON解析的对象，"reply"的值是一个【数组】：
{
  "reply": ["第一条消息。", "这是第二条。"],
  "suggestions": ["最期望的回答", "另一条温和的回答", "中立的回答", "挑战性的回答"]
}`;

        // 将系统指令和对话历史结合
        const finalMessagesForApi = [
            { role: "system", content: finalPrompt },
            ...messagesForApi
        ];
        
        try {
            let requestUrl = appData.appSettings.apiUrl;
            if (!requestUrl.endsWith('/chat/completions')) {
                requestUrl = requestUrl.endsWith('/') ? requestUrl + 'chat/completions' : requestUrl + '/chat/completions';
            }
            
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.appSettings.apiKey}` },
                // --- 关键：使用改造后的消息体 ---
                body: JSON.stringify({ model: appData.appSettings.apiModel, messages: finalMessagesForApi })
            });
            
            removeLoadingBubble();

            if (!response.ok) throw new Error(`HTTP 错误 ${response.status}: ${await response.text()}`);
            const data = await response.json();
            if (data.error) throw new Error(`API返回错误: ${data.error.message}`);
            if (!data.choices || data.choices.length === 0) throw new Error("API返回了无效的数据结构。");
            
            const responseText = data.choices[0].message.content;
            const jsonMatch = responseText.match(/{[\s\S]*}/);
            
            if (!jsonMatch) {
                 displayMessage(`(AI未能返回标准格式): ${responseText}`, 'assistant', { isNew: true });
            } else {
                const responseData = JSON.parse(jsonMatch[0]);
                if (responseData.suggestions && responseData.suggestions.length > 0) {
                    lastReceivedSuggestions = responseData.suggestions;
                }
                if (Array.isArray(responseData.reply)) {
                    for (const msg of responseData.reply) {
                        if (msg) {
                            if (msg.startsWith('[voice]')) {
                                const voiceContent = msg.replace('[voice]', '').trim();
                                displayMessage(voiceContent, 'assistant', { isNew: true, type: 'voice' });
                            } else if (msg.startsWith('[IMAGE:')) {
                                // --- 新增：解析 AI 发送的图片 ---
                                const imageContent = msg.substring(7, msg.length - 1).trim();
                                displayMessage(imageContent, 'assistant', { isNew: true, type: 'image' });
                            } else {
                                displayMessage(msg, 'assistant', { isNew: true, type: 'text' });
                            }
                            await sleep(Math.random() * 400 + 300);
                        }
                    }
                } // ... (后面的 else if 部分保持不变) ...
            }
        } catch (error) {
            console.error('API调用失败:', error);
            removeLoadingBubble();
            displayMessage(`(｡•́︿•̀｡) 哎呀，出错了: ${error.message}`, 'assistant', { isNew: true });
        }
    }
    
    function displaySuggestions() {
        aiSuggestionPanel.innerHTML = '';
        if (lastReceivedSuggestions.length === 0) {
            aiSuggestionPanel.innerHTML = `<span style="color:#999;font-size:12px;">暂时没有建议哦~</span>`;
        } else {
            lastReceivedSuggestions.forEach(text => {
                const button = document.createElement('button');
                button.className = 'suggestion-button';
                button.textContent = text;
                button.onclick = () => {
                    chatInput.value = text;
                    aiSuggestionPanel.classList.add('hidden');
                };
                aiSuggestionPanel.appendChild(button);
            });
        }
        aiSuggestionPanel.classList.remove('hidden');
    }

    async function fetchModels() {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        if (!url || !key) { alert('请先填写 API 地址和密钥！'); return; }
        fetchModelsButton.textContent = '...';
        fetchModelsButton.disabled = true;
        try {
            const modelsUrl = url.replace(/\/chat\/completions\/?$/, '') + '/models';
            const response = await fetch(modelsUrl, { headers: { 'Authorization': `Bearer ${key}` } });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            if (!data.data || !Array.isArray(data.data)) throw new Error("模型列表格式不正确。");
            const models = data.data.map(model => model.id).sort();
            apiModelSelect.innerHTML = '';
            models.forEach(modelId => {
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelId;
                apiModelSelect.appendChild(option);
            });
            if (appData.appSettings.apiModel && models.includes(appData.appSettings.apiModel)) {
                apiModelSelect.value = appData.appSettings.apiModel;
            }
            alert('模型列表已成功拉取！');
        } catch (error) {
            alert(`拉取模型失败: ${error.message}`);
        } finally {
            fetchModelsButton.textContent = '拉取';
            fetchModelsButton.disabled = false;
        }
    }

    async function openProfileModal() {
        modalUserNameInput.value = appData.currentUser.name;
        modalUserPersonaInput.value = appData.currentUser.persona;
        const userAvatarBlob = await db.getImage('user_avatar');
        userAvatarPreview.src = userAvatarBlob ? URL.createObjectURL(userAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        userProfileModal.classList.remove('hidden');
    }

    function closeProfileModal() {
        userProfileModal.classList.add('hidden');
    }

    function openVoiceModal() {
        voiceTextInput.value = '';
        voiceInputModal.classList.remove('hidden');
        voiceTextInput.focus();
    }

    function closeVoiceModal() {
        voiceInputModal.classList.add('hidden');
    }

    function sendVoiceMessage() {
        const text = voiceTextInput.value.trim();
        if (!text) {
            alert("请输入语音内容！");
            return;
        }
        // 1. 将语音消息添加到暂存数组
        stagedUserMessages.push({ content: text, type: 'voice' });
        // 2. 在界面上显示这个“暂存”的语音消息
        displayMessage(text, 'user', { isStaged: true, type: 'voice' });
        // 3. 关闭弹窗
        closeVoiceModal();
        // 4. 不再调用 getAiResponse()，等待用户点击“发送”按钮
    }

    async function openContactSettings() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        const avatarBlob = await db.getImage(`${contact.id}_avatar`);
        csContactAvatar.src = avatarBlob ? URL.createObjectURL(avatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';
        csContactName.textContent = contact.remark;
        csPinToggle.checked = contact.isPinned || false;
        switchToView('contact-settings-view');
    }

    async function openAiEditor() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        
        const avatarBlob = await db.getImage(`${contact.id}_avatar`);
        avatarPreview.src = avatarBlob ? URL.createObjectURL(avatarBlob) : '';
        const photoBlob = await db.getImage(`${contact.id}_photo`);
        photoPreview.src = photoBlob ? URL.createObjectURL(photoBlob) : '';
        
        aiEditorName.value = contact.name;
        aiEditorRemark.value = contact.remark;
        aiEditorPersona.value = contact.persona;
        aiEditorMemory.value = contact.memory;
        aiEditorWorldbook.innerHTML = '';
        if (contact.worldBook && contact.worldBook.length > 0) {
            contact.worldBook.forEach(entry => renderWorldbookEntry(entry.key, entry.value));
        }
        switchToView('ai-editor-view');
    }
    
    function handleImageUpload(file, key, previewElement) {
        if (!file || !file.type.startsWith('image/')) {
            alert('请选择一个图片文件！');
            return;
        }
        previewElement.src = URL.createObjectURL(file);
        db.saveImage(key, file)
            .then(async () => {
                console.log(`图片 ${key} 保存成功!`);
                if (key === 'user_avatar') {
                    await renderCurrentUserUI();
                } else if (key.endsWith('_avatar')) {
                    await renderChatList();
                }
            })
            .catch(err => {
                console.error(err);
                alert('图片保存失败！');
            });
    }

    function renderWorldbookEntry(key = '', value = '') {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'worldbook-entry';
        entryDiv.innerHTML = `
            <div class="worldbook-header">
                <input type="text" class="worldbook-key" placeholder="关键词" value="${key}">
                <button class="worldbook-delete-btn">-</button>
            </div>
            <textarea class="worldbook-value" placeholder="内容...">${value}</textarea>
        `;
        entryDiv.querySelector('.worldbook-delete-btn').onclick = () => entryDiv.remove();
        aiEditorWorldbook.appendChild(entryDiv);
    }

    function saveAiProfile() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        contact.name = aiEditorName.value.trim() || 'AI伙伴';
        contact.remark = aiEditorRemark.value.trim() || contact.name;
        contact.persona = aiEditorPersona.value;
        contact.memory = aiEditorMemory.value;
        contact.worldBook = [];
        aiEditorWorldbook.querySelectorAll('.worldbook-entry').forEach(entryDiv => {
            const key = entryDiv.querySelector('.worldbook-key').value.trim();
            const value = entryDiv.querySelector('.worldbook-value').value.trim();
            if (key) {
                contact.worldBook.push({ key, value });
            }
        });
        saveAppData();
        chatAiName.textContent = contact.remark;
        renderChatList();
        alert('AI信息已保存！');
        switchToView('contact-settings-view');
    }
    
    function clearActiveChatHistory() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        const isConfirmed = confirm(`确定要清空与 ${contact.remark} 的所有聊天记录吗？\n此操作无法撤销。`);
        if (isConfirmed) {
            contact.chatHistory = [];
            saveAppData();
            messageContainer.innerHTML = '';
            renderChatList();
            alert('聊天记录已清空。');
        }
    }

    function togglePinActiveChat() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        contact.isPinned = csPinToggle.checked;
        saveAppData();
        renderChatList();
    }

    function addSelectListeners(element) {
        element.addEventListener('mousedown', (e) => {
            if (isSelectMode || e.button !== 0) return;
            longPressTimer = setTimeout(() => enterSelectMode(element), 500);
        });
        element.addEventListener('mouseup', () => clearTimeout(longPressTimer));
        element.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
        element.addEventListener('touchstart', (e) => {
            if (isSelectMode) return;
            longPressTimer = setTimeout(() => enterSelectMode(element), 500);
        });
        element.addEventListener('touchend', () => clearTimeout(longPressTimer));
        element.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        element.addEventListener('click', () => {
            if (isSelectMode) toggleMessageSelection(element);
        });
    }

    function enterSelectMode(element) {
        isSelectMode = true;
        chatHeaderNormal.classList.add('hidden');
        chatHeaderSelect.classList.remove('hidden');
        messageContainer.querySelectorAll('.message-row').forEach(row => {
            row.classList.add('in-select-mode');
            row.querySelector('.select-checkbox').classList.remove('hidden');
        });
        if (element) toggleMessageSelection(element);
    }

    function exitSelectMode() {
        isSelectMode = false;
        selectedMessages.clear();
        chatHeaderNormal.classList.remove('hidden');
        chatHeaderSelect.classList.add('hidden');
        editSelectedButton.classList.add('hidden');
        messageContainer.querySelectorAll('.message-row').forEach(row => {
            row.classList.remove('in-select-mode');
            const checkbox = row.querySelector('.select-checkbox');
            if (checkbox) {
                checkbox.classList.add('hidden');
                checkbox.classList.remove('checked');
            }
        });
    }

    function toggleMessageSelection(element) {
        const messageId = element.dataset.messageId;
        const checkbox = element.querySelector('.select-checkbox');
        if (!checkbox) return;
        if (selectedMessages.has(messageId)) {
            selectedMessages.delete(messageId);
            checkbox.classList.remove('checked');
        } else {
            selectedMessages.add(messageId);
            checkbox.classList.add('checked');
        }
        selectCount.textContent = `已选择${selectedMessages.size}项`;
        deleteSelectedButton.disabled = selectedMessages.size === 0;

        const firstSelectedId = selectedMessages.values().next().value;
        const firstSelectedEl = messageContainer.querySelector(`[data-message-id="${firstSelectedId}"]`);
        
        if (selectedMessages.size === 1 && firstSelectedEl && firstSelectedEl.dataset.role === 'user') {
            editSelectedButton.classList.remove('hidden');
        } else {
            editSelectedButton.classList.add('hidden');
        }
    }
    
    function editSelectedMessage() {
        if (selectedMessages.size !== 1) return;
        const messageId = selectedMessages.values().next().value;
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        const messageData = contact.chatHistory.find(msg => msg.id === messageId);
        if (!messageData || messageData.role !== 'user') return;
        const newText = prompt("编辑你的消息：", messageData.content);
        if (newText !== null && newText.trim() !== '') {
            messageData.content = newText.trim();
            saveAppData();
            const messageElement = messageContainer.querySelector(`[data-message-id="${messageId}"] .message`);
            if (messageElement) {
                 messageElement.textContent = newText.trim();
            }
            renderChatList();
        }
        exitSelectMode();
    }

    function deleteSelectedMessages() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        contact.chatHistory = contact.chatHistory.filter(msg => !selectedMessages.has(msg.id));
        saveAppData();
        selectedMessages.forEach(id => {
            const el = messageContainer.querySelector(`[data-message-id="${id}"]`);
            if (el) el.remove();
        });
        exitSelectMode();
        renderChatList();
    }
    
    function addNewContact() {
        const newContactId = Date.now();
        const newContact = {
            id: newContactId,
            name: `新伙伴 ${newContactId.toString().slice(-4)}`,
            remark: `新伙伴 ${newContactId.toString().slice(-4)}`,
            persona: `新伙伴 ${newContactId.toString().slice(-4)}\n这是一个新创建的AI伙伴，等待你为TA注入灵魂。`,
            worldBook: [],
            memory: '',
            chatHistory: [],
            moments: [],
            isPinned: false
        };
        appData.aiContacts.push(newContact);
        saveAppData();
        renderChatList();
        activeChatContactId = newContactId;
        openContactSettings();
    }

    function bindEventListeners() {
        navButtons.forEach(button => button.addEventListener('click', () => switchToView(button.dataset.view)));
        backToListButton.addEventListener('click', () => switchToView('chat-list-view'));
        backFromMomentsBtn.addEventListener('click', () => switchToView('chat-list-view'));
        backFromSettingsBtn.addEventListener('click', () => switchToView('chat-list-view'));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault();
                stageUserMessage();
            }
        });
        sendButton.addEventListener('click', () => {
            commitAndSendStagedMessages();
        });
        saveSettingsButton.addEventListener('click', () => {
            appData.appSettings.apiType = apiTypeSelect.value;
            appData.appSettings.apiUrl = apiUrlInput.value.trim();
            appData.appSettings.apiKey = apiKeyInput.value.trim();
            appData.appSettings.apiModel = apiModelSelect.value;
            appData.appSettings.contextLimit = parseInt(contextLimitInput.value) || 50;
            saveAppData();
            alert('设置已保存！');
        });
        apiTypeSelect.addEventListener('change', updateSettingsUI);
        fetchModelsButton.addEventListener('click', fetchModels);
        currentUserAvatar.addEventListener('click', openProfileModal);
        closeModalButton.addEventListener('click', closeProfileModal);
        saveProfileButton.addEventListener('click', () => {
            appData.currentUser.name = modalUserNameInput.value.trim();
            appData.currentUser.persona = modalUserPersonaInput.value;
            saveAppData();
            renderCurrentUserUI();
            closeProfileModal();
            alert('用户信息已保存！');
        });
        userAvatarUploadArea.addEventListener('click', () => userAvatarUploadInput.click());
        userAvatarUploadInput.addEventListener('change', (e) => {
            handleImageUpload(e.target.files[0], 'user_avatar', userAvatarPreview);
        });
        addContactButton.addEventListener('click', addNewContact);
        chatSettingsButton.addEventListener('click', openContactSettings);
        backToChatButton.addEventListener('click', () => switchToView('chat-window-view'));
        csEditAiProfile.addEventListener('click', openAiEditor);
        backToContactSettingsButton.addEventListener('click', () => switchToView('contact-settings-view'));
        addWorldbookEntryButton.addEventListener('click', () => renderWorldbookEntry());
        saveAiProfileButton.addEventListener('click', saveAiProfile);
        chatHeaderInfo.addEventListener('click', openAiEditor);
        
        // --- 语音按钮 (这个是正常的) ---
        voiceBtn.addEventListener('click', openVoiceModal);
        cancelVoiceButton.addEventListener('click', closeVoiceModal);
        confirmVoiceButton.addEventListener('click', sendVoiceMessage);

        // --- 图片和相机按钮 (使用我们最新的弹窗逻辑) ---
        imageBtn.addEventListener('click', () => openImageUploadModal('upload'));
        cameraBtn.addEventListener('click', () => openImageUploadModal('simulate'));
        
        // --- (恢复) 其他被误删的按钮事件 ---
        redPacketBtn.addEventListener('click', () => {
            const text = prompt("模拟发红包，请输入祝福语：", "恭喜发财");
            if (text) {
                // 修改为暂存模式
                stagedUserMessages.push({ content: text, type: 'red-packet' });
                displayMessage(text, 'user', { isStaged: true, type: 'red-packet' });
            }
        });
        emojiBtn.addEventListener('click', () => alert("开发中！"));
        moreFunctionsButton.addEventListener('click', () => alert("开发中！"));
        aiHelperButton.addEventListener('click', () => {
            if (aiSuggestionPanel.classList.contains('hidden')) {
                displaySuggestions();
            } else {
                aiSuggestionPanel.classList.add('hidden');
            }
        });

        // --- (恢复) 选择模式的按钮事件 ---
        cancelSelectButton.addEventListener('click', exitSelectMode);
        editSelectedButton.addEventListener('click', editSelectedMessage);
        deleteSelectedButton.addEventListener('click', deleteSelectedMessages);
        
        // --- (恢复) AI编辑器和头像上传的事件 ---
        avatarUploadArea.addEventListener('click', () => avatarUploadInput.click());
        avatarUploadInput.addEventListener('change', (e) => {
            handleImageUpload(e.target.files[0], `${activeChatContactId}_avatar`, avatarPreview);
        });
        photoUploadArea.addEventListener('click', () => photoUploadInput.click());
        photoUploadInput.addEventListener('change', (e) => {
            handleImageUpload(e.target.files[0], `${activeChatContactId}_photo`, photoPreview);
        });
        
        // --- (恢复) 聊天设置页面的事件 ---
        contactSettingsView.querySelectorAll('.settings-item').forEach(item => {
            if (item.id !== 'cs-edit-ai-profile' && item.id !== 'cs-clear-history' && !item.querySelector('.switch')) {
                item.addEventListener('click', () => alert('功能开发中，敬请期待！'));
            }
        });
        csClearHistory.addEventListener('click', clearActiveChatHistory);
        csPinToggle.addEventListener('change', togglePinActiveChat);

        // --- (新增) 绑定我们新添加的图片弹窗的按钮事件 ---
        userImageUploadArea.addEventListener('click', () => userImageUploadInput.click());
        userImageUploadInput.addEventListener('change', handleImagePreview);
        cancelImageUploadButton.addEventListener('click', closeImageUploadModal);
        confirmImageUploadButton.addEventListener('click', sendImageMessage);
        // (注意：ai-image-modal 的关闭按钮可能在早期版本中未添加，这里补上)
        if(closeAiImageModalButton) {
            closeAiImageModalButton.addEventListener('click', closeAiImageModal);
        }
    }
    
    initialize();
});
