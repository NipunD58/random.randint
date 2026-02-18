const STORAGE_KEY = 'uploadedBlogPosts_v2';
const DEFAULT_ACCENT = 'green';

let allPosts = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeHomePage();
});

function initializeHomePage() {
    const postsGrid = document.getElementById('postsGrid');
    if (!postsGrid) {
        return;
    }

    allPosts = getAllPosts();
    setupCategoryFilter(allPosts);
    attachToolbarEvents();
    renderFilteredPosts();
}

function getAllPosts() {
    const uploadedPosts = getUploadedPosts();
    const byId = new Map();

    [...blogPosts, ...uploadedPosts].forEach(post => {
        byId.set(post.id, {
            ...post,
            accent: post.accent || DEFAULT_ACCENT
        });
    });

    return Array.from(byId.values());
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
        console.error('Could not read uploaded posts:', error);
        return [];
    }
}

function setupCategoryFilter(posts) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) {
        return;
    }

    const categories = Array.from(new Set(posts.map(post => post.category))).sort((a, b) => {
        return a.localeCompare(b);
    });

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function attachToolbarEvents() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');
    const clearFilters = document.getElementById('clearFilters');

    if (searchInput) {
        searchInput.addEventListener('input', renderFilteredPosts);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', renderFilteredPosts);
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', renderFilteredPosts);
    }

    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
            }
            if (categoryFilter) {
                categoryFilter.value = 'all';
            }
            if (sortSelect) {
                sortSelect.value = 'newest';
            }

            renderFilteredPosts();
        });
    }
}

function renderFilteredPosts() {
    const postsGrid = document.getElementById('postsGrid');
    const resultsCount = document.getElementById('resultsCount');

    if (!postsGrid) {
        return;
    }

    const searchTerm = String(document.getElementById('searchInput')?.value || '')
        .trim()
        .toLowerCase();
    const category = String(document.getElementById('categoryFilter')?.value || 'all');
    const sortBy = String(document.getElementById('sortSelect')?.value || 'newest');

    let filteredPosts = [...allPosts].filter(post => {
        const inCategory = category === 'all' || post.category === category;
        const inSearch = !searchTerm
            || post.title.toLowerCase().includes(searchTerm)
            || post.excerpt.toLowerCase().includes(searchTerm)
            || post.category.toLowerCase().includes(searchTerm);

        return inCategory && inSearch;
    });

    filteredPosts = sortPosts(filteredPosts, sortBy);

    postsGrid.innerHTML = '';

    if (filteredPosts.length === 0) {
        postsGrid.innerHTML = `
            <article class="empty-state">
                <h2>No posts found</h2>
                <p>Try adjusting your search or upload a new blog post.</p>
                <a href="create-post.html" class="cta-button">Upload New Blog</a>
            </article>
        `;
    } else {
        filteredPosts.forEach(post => {
            postsGrid.appendChild(createBlogCard(post));
        });
    }

    if (resultsCount) {
        const suffix = filteredPosts.length === 1 ? 'post' : 'posts';
        resultsCount.textContent = `${filteredPosts.length} ${suffix} shown`;
    }
}

function sortPosts(posts, sortBy) {
    if (sortBy === 'oldest') {
        return posts.sort((a, b) => getPostTime(a) - getPostTime(b));
    }

    if (sortBy === 'title') {
        return posts.sort((a, b) => a.title.localeCompare(b.title));
    }

    return posts.sort((a, b) => getPostTime(b) - getPostTime(a));
}

function getPostTime(post) {
    if (post.createdAt) {
        return new Date(post.createdAt).getTime();
    }

    return new Date(post.date).getTime();
}

function createBlogCard(post) {
    const card = document.createElement('article');
    card.className = 'blog-card';
    card.setAttribute('data-accent', post.accent || DEFAULT_ACCENT);
    card.setAttribute('data-id', String(post.id));
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Read post: ${post.title}`);

    card.innerHTML = `
        <div class="card-image">
            <img src="${post.image}" alt="${post.title}" loading="lazy">
        </div>
        <div class="card-content">
            <span class="card-category">${post.category}</span>
            <h2 class="card-title">${post.title}</h2>
            <p class="card-excerpt">${post.excerpt}</p>
            <div class="card-meta">
                <span class="card-date">${post.date}</span>
                <span class="card-read-time">${post.readTime}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        handleBlogClick(post);
    });

    card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleBlogClick(post);
        }
    });

    return card;
}

function handleBlogClick(post) {
    window.location.href = `post.html?id=${post.id}`;
}

function addBlogPost(newPost) {
    const postWithDefaults = {
        ...newPost,
        id: newPost.id || Date.now(),
        accent: newPost.accent || DEFAULT_ACCENT,
        createdAt: newPost.createdAt || new Date().toISOString()
    };

    const uploadedPosts = getUploadedPosts();
    uploadedPosts.unshift(postWithDefaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedPosts));

    allPosts = getAllPosts();
    renderFilteredPosts();
}
