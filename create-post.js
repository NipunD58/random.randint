const STORAGE_KEY = 'uploadedBlogPosts_v2';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=700&fit=crop';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createPostForm');
    const status = document.getElementById('formStatus');
    const contentEditor = document.getElementById('contentEditor');
    const contentInput = document.getElementById('content');

    contentEditor.addEventListener('paste', async event => {
        await handleEditorPaste(event, status);
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        status.textContent = 'Publishing...';

        try {
            const formData = new FormData(form);
            const imageFromFile = await fileToDataUrl(formData.get('imageFile'));
            const imageUrl = String(formData.get('imageUrl') || '').trim();
            const contentHtml = sanitizeAndNormalizeHtml(contentEditor.innerHTML);

            if (!hasVisibleContent(contentHtml)) {
                status.textContent = 'Please add post content before publishing.';
                contentEditor.focus();
                return;
            }

            contentInput.value = contentHtml;

            const post = {
                id: Date.now(),
                title: String(formData.get('title')).trim(),
                excerpt: String(formData.get('excerpt')).trim(),
                category: String(formData.get('category')).trim(),
                date: formatDate(new Date()),
                readTime: String(formData.get('readTime')).trim(),
                image: imageFromFile || imageUrl || DEFAULT_IMAGE,
                accent: String(formData.get('accent') || 'green').trim(),
                content: contentHtml,
                createdAt: new Date().toISOString(),
                isUserPost: true
            };

            const uploadedPosts = getUploadedPosts();
            uploadedPosts.unshift(post);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedPosts));

            status.textContent = 'Published successfully. Redirecting...';
            window.setTimeout(() => {
                window.location.href = `post.html?id=${post.id}`;
            }, 400);
        } catch (error) {
            console.error(error);
            status.textContent = 'Could not publish this blog. Please try again.';
        }
    });
});

async function handleEditorPaste(event, status) {
    const clipboard = event.clipboardData;
    if (!clipboard) {
        return;
    }

    const imageItems = Array.from(clipboard.items || []).filter(item => {
        return item.type && item.type.startsWith('image/');
    });

    if (imageItems.length === 0) {
        return;
    }

    event.preventDefault();
    status.textContent = 'Adding pasted image...';

    for (const imageItem of imageItems) {
        const file = imageItem.getAsFile();
        if (!file) {
            continue;
        }

        const imageDataUrl = await fileToDataUrl(file);
        if (imageDataUrl) {
            insertImageAtCursor(imageDataUrl);
        }
    }

    status.textContent = 'Image pasted into content.';
    window.setTimeout(() => {
        if (status.textContent === 'Image pasted into content.') {
            status.textContent = '';
        }
    }, 1200);
}

function insertImageAtCursor(imageDataUrl) {
    const selection = window.getSelection();
    const image = document.createElement('img');
    image.src = imageDataUrl;
    image.alt = 'Inline blog image';
    image.className = 'editor-inline-image';

    const paragraph = document.createElement('p');
    paragraph.appendChild(image);

    if (!selection || selection.rangeCount === 0) {
        const editor = document.getElementById('contentEditor');
        editor.appendChild(paragraph);
        editor.appendChild(document.createElement('p'));
        return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(paragraph);

    const spacer = document.createElement('p');
    spacer.appendChild(document.createElement('br'));
    paragraph.parentNode.insertBefore(spacer, paragraph.nextSibling);

    range.setStart(spacer, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function hasVisibleContent(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    const hasText = container.textContent.trim().length > 0;
    const hasImage = container.querySelector('img') !== null;
    return hasText || hasImage;
}

function sanitizeAndNormalizeHtml(html) {
    const source = document.createElement('div');
    source.innerHTML = html;

    const target = document.createElement('div');
    source.childNodes.forEach(node => {
        const cleaned = sanitizeNode(node);
        if (cleaned) {
            target.appendChild(cleaned);
        }
    });

    return target.innerHTML.trim();
}

function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const value = node.textContent || '';
        return value.trim() ? document.createTextNode(value) : null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const tag = node.tagName.toLowerCase();
    const allowedTags = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'img']);

    if (!allowedTags.has(tag)) {
        const fragment = document.createDocumentFragment();
        node.childNodes.forEach(child => {
            const cleanedChild = sanitizeNode(child);
            if (cleanedChild) {
                fragment.appendChild(cleanedChild);
            }
        });
        return fragment.childNodes.length ? fragment : null;
    }

    const element = document.createElement(tag);

    if (tag === 'a') {
        const href = node.getAttribute('href') || '';
        if (isSafeHref(href)) {
            element.setAttribute('href', href);
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
        }
    }

    if (tag === 'img') {
        const src = node.getAttribute('src') || '';
        if (!isSafeImageSource(src)) {
            return null;
        }
        element.setAttribute('src', src);
        element.setAttribute('alt', node.getAttribute('alt') || 'Inline blog image');
        element.classList.add('post-inline-image');
        return element;
    }

    node.childNodes.forEach(child => {
        const cleanedChild = sanitizeNode(child);
        if (cleanedChild) {
            element.appendChild(cleanedChild);
        }
    });

    return element;
}

function isSafeHref(href) {
    return /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^#/i.test(href) || /^\//.test(href);
}

function isSafeImageSource(src) {
    return /^data:image\//i.test(src) || /^https?:\/\//i.test(src) || /^\//.test(src);
}

function getUploadedPosts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Could not load uploaded posts:', error);
        return [];
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function fileToDataUrl(file) {
    if (!file || !(file instanceof File) || file.size === 0) {
        return Promise.resolve('');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read uploaded image file'));
        reader.readAsDataURL(file);
    });
}
