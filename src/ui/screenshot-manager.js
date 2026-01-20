// Screenshot capture and gallery management

const STORAGE_PREFIX = 'fractal-screenshot-';

export class ScreenshotManager {
    constructor(canvas, screenshotOverlay, gridEl) {
        this.canvas = canvas;
        this.overlay = screenshotOverlay;
        this.grid = gridEl;
        this.visible = false;
        this.previewEl = null;
        this.selectedId = null;

        this._boundKeyDown = this._handleKeyDown.bind(this);
    }

    capture(camera, sculptureAnimators) {
        // Capture canvas as JPEG (more efficient than PNG for photos)
        const imageData = this.canvas.toDataURL('image/jpeg', 0.85);

        // Build metadata
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            imageData,
            camera: {
                pos: [...camera.pos],
                yaw: camera.yaw,
                pitch: camera.pitch,
                zoom: camera.zoom
            },
            fractals: {}
        };

        // Capture fractal animator states
        if (sculptureAnimators) {
            for (const key in sculptureAnimators) {
                entry.fractals[key] = this._deepClone(sculptureAnimators[key].getCurrent());
            }
        }

        // Save to localStorage
        this._saveToStorage(entry);

        // Visual feedback - white flash
        this._showFlash();
    }

    _deepClone(obj) {
        if (Array.isArray(obj)) return obj.map(x => this._deepClone(x));
        if (typeof obj === 'object' && obj !== null) {
            const clone = {};
            for (const key in obj) clone[key] = this._deepClone(obj[key]);
            return clone;
        }
        return obj;
    }

    _showFlash() {
        const flash = document.createElement('div');
        flash.className = 'screenshot-flash';
        document.body.appendChild(flash);
        flash.addEventListener('animationend', () => flash.remove());
    }

    _saveToStorage(entry) {
        try {
            localStorage.setItem(STORAGE_PREFIX + entry.id, JSON.stringify(entry));
        } catch (e) {
            console.warn('Failed to save screenshot:', e);
            // Could be quota exceeded - try removing oldest
            const all = this._loadFromStorage();
            if (all.length > 0) {
                this._deleteFromStorage(all[0].id);
                try {
                    localStorage.setItem(STORAGE_PREFIX + entry.id, JSON.stringify(entry));
                } catch (e2) {
                    console.error('Still failed to save screenshot after cleanup:', e2);
                }
            }
        }
    }

    _loadFromStorage() {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                try {
                    const entry = JSON.parse(localStorage.getItem(key));
                    entries.push(entry);
                } catch (e) {
                    // Corrupt entry, skip
                }
            }
        }
        // Sort by timestamp, newest first
        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries;
    }

    _deleteFromStorage(id) {
        localStorage.removeItem(STORAGE_PREFIX + id);
    }

    show() {
        this.visible = true;
        this._renderGrid();
        this.overlay.classList.remove('hidden');
        document.addEventListener('keydown', this._boundKeyDown);
    }

    hide() {
        this.visible = false;
        this.overlay.classList.add('hidden');
        this._hidePreview();
        document.removeEventListener('keydown', this._boundKeyDown);
    }

    isVisible() {
        return this.visible;
    }

    _handleKeyDown(e) {
        if (e.code === 'Escape') {
            e.preventDefault();
            if (this.previewEl) {
                this._hidePreview();
            } else {
                this.hide();
            }
        }
        if (e.code === 'Delete' && this.selectedId) {
            this._handleDelete(this.selectedId);
            this._hidePreview();
        }
    }

    _getStorageInfo() {
        let used = 0;
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                const item = localStorage.getItem(key);
                if (item) {
                    used += item.length * 2; // UTF-16 = 2 bytes per char
                    count++;
                }
            }
        }
        // localStorage quota is typically 5-10MB, assume 5MB
        const quota = 5 * 1024 * 1024;
        return { used, quota, count };
    }

    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    _renderStorageInfo() {
        // Remove existing storage info
        const existing = this.overlay.querySelector('.storage-info');
        if (existing) existing.remove();

        const { used, quota, count } = this._getStorageInfo();
        const pct = Math.min(100, (used / quota) * 100);

        const info = document.createElement('div');
        info.className = 'storage-info';
        info.innerHTML = `${count} capture${count !== 1 ? 's' : ''} · ${this._formatBytes(used)} / ${this._formatBytes(quota)} ` +
            `<span class="storage-bar"><span class="storage-bar-fill" style="width: ${pct}%"></span></span>`;

        // Insert after the h2
        const h2 = this.overlay.querySelector('h2');
        if (h2 && h2.nextSibling) {
            h2.parentNode.insertBefore(info, h2.nextSibling);
        }
    }

    _renderGrid() {
        const entries = this._loadFromStorage();
        this.grid.innerHTML = '';
        this._renderStorageInfo();

        for (const entry of entries) {
            const item = document.createElement('div');
            item.className = 'screenshot-item';
            item.dataset.id = entry.id;

            const img = document.createElement('img');
            img.src = entry.imageData;
            img.alt = 'Screenshot';

            const meta = document.createElement('div');
            meta.className = 'meta';
            const date = new Date(entry.timestamp);
            const pos = entry.camera.pos.map(v => v.toFixed(1)).join(', ');

            let metaText = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
            metaText += `pos: ${pos}`;

            if (entry.fractals) {
                if (entry.fractals.mandelbox) {
                    const m = entry.fractals.mandelbox;
                    metaText += `\nmbox: s=${m.scale?.toFixed(2)} minR=${m.minR?.toFixed(2)} fixR=${m.fixedR?.toFixed(2)}`;
                }
                if (entry.fractals.mandelbulb) {
                    const b = entry.fractals.mandelbulb;
                    metaText += `\nbulb: p=${b.power?.toFixed(1)} φp=${b.phiPower?.toFixed(1)}`;
                }
                if (entry.fractals.julia) {
                    const j = entry.fractals.julia;
                    if (j.c) {
                        metaText += `\njulia: c=(${j.c.map(v => v?.toFixed(2)).join(', ')})`;
                    }
                }
            }
            meta.textContent = metaText;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleDelete(entry.id);
            });

            item.appendChild(img);
            item.appendChild(meta);
            item.appendChild(deleteBtn);

            item.addEventListener('click', () => {
                this.selectedId = entry.id;
                this._showPreview(entry.imageData);
            });

            this.grid.appendChild(item);
        }
    }

    _handleDelete(id) {
        this._deleteFromStorage(id);
        this._renderGrid();
    }

    _showPreview(imageData) {
        if (this.previewEl) {
            this.previewEl.remove();
        }

        this.previewEl = document.createElement('div');
        this.previewEl.id = 'screenshot-preview';

        const img = document.createElement('img');
        img.src = imageData;

        this.previewEl.appendChild(img);
        this.previewEl.addEventListener('click', () => this._hidePreview());

        document.body.appendChild(this.previewEl);
    }

    _hidePreview() {
        if (this.previewEl) {
            this.previewEl.remove();
            this.previewEl = null;
            this.selectedId = null;
        }
    }
}
