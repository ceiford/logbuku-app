// ==================== KONFIGURASI GITHUB ====================
const GITHUB_TOKEN = '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';        // GANTI dengan token Anda
const GITHUB_OWNER = 'ceiford';    // GANTI
const GITHUB_REPO  = 'logbuku-app';     // GANTI
const GITHUB_PATH  = 'data/logbook.json';        // path file JSON di repositori

// ==================== STATE & INISIALISASI ====================
let entries = [];                // array entri lokal
let currentFilter = 'SEMUA';

// ==================== UTILITAS TANGGAL & QUOTE ====================
const QUOTES = [
    "Hari ini adalah kanvas, lukislah yang indah.",
    "Jangan menunggu motivasi, ciptakan itu.",
    "Satu langkah kecil lebih baik dari seribu rencana.",
    "Kesempatan datang pada mereka yang bergerak.",
    "Fokus pada hal yang bisa kau kendalikan.",
    "Bersyukur membuka pintu kebahagiaan.",
    "Hidup tidak tentang menunggu badai berlalu.",
    "Kebaikan kecil hari ini, dampak besar nanti.",
    "Jadikan hari ini berarti bagi orang lain.",
    "Pikiran positif melahirkan energi positif.",
    "Kerja keras tanpa henti akan terbayar.",
    "Nikmati prosesnya, hasilnya bonus.",
    "Hari ini lebih baik dari kemarin.",
    "Senyum adalah sedekah paling mudah.",
    "Ide hebat dimulai dari catatan kecil.",
    "Istirahat sejenak, lalu lanjutkan.",
    "Percayalah pada proses yang sedang berjalan.",
    "Konsistensi mengalahkan intensitas.",
    "Berani mencoba adalah setengah keberhasilan.",
    "Hari ini adalah hadiah, itu sebabnya disebut present."
];

function getDailyQuote(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    return QUOTES[Math.abs(hash) % QUOTES.length];
}

function getCurrentDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayName(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('id-ID', { weekday:'long' });
}

function formatTanggalIndonesia(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}

// ==================== FUNGSI GITHUB API ====================
async function fetchEntriesFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    try {
        const res = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if (res.status === 404) {
            // File belum ada, kembalikan array kosong
            return [];
        }
        if (!res.ok) {
            throw new Error(`Gagal mengambil file: ${res.status}`);
        }
        const data = await res.json();
        // content adalah base64
        const content = atob(data.content);
        return JSON.parse(content);
    } catch (e) {
        console.error('fetchEntriesFromGitHub error:', e);
        return [];
    }
}

async function saveEntriesToGitHub(entriesArray) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    try {
        // Dapatkan SHA file saat ini (jika ada)
        let sha = null;
        const getRes = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if (getRes.ok) {
            const existing = await getRes.json();
            sha = existing.sha;
        }

        // Encode konten ke base64
        const content = btoa(JSON.stringify(entriesArray, null, 2));

        const body = {
            message: 'Update logbook dari aplikasi',
            content: content,
            ...(sha && { sha })
        };

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(`Gagal menyimpan: ${err.message}`);
        }
        console.log('Data berhasil disimpan ke GitHub');
    } catch (e) {
        console.error('saveEntriesToGitHub error:', e);
        alert('Gagal menyimpan ke GitHub: ' + e.message);
    }
}

// ==================== RENDER HEADER + JAM ====================
function renderTodayHeader() {
    const today = getCurrentDateStr();
    const dayName = getDayName(today);
    const quote = getDailyQuote(today);
    const formatted = formatTanggalIndonesia(today);
    
    document.getElementById('todayHeader').innerHTML = `
        <span class="date-large">${formatted}</span>
        <span class="day-large">${dayName}</span>
        <span class="quote-of-day">“${quote}”</span>
        <span class="clock" id="liveClock">--:--:--</span>
    `;
    
    updateClock();
}

function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;
    
    function refreshClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        clockElement.textContent = timeStr;
    }
    
    refreshClock();
    setInterval(refreshClock, 1000);
}

// ==================== FILTER & RENDER ENTRI ====================
function rebuildFilterOptions() {
    const matkulSet = new Set(entries.map(e => e.matkul).filter(Boolean));
    const select = document.getElementById('filterMatkul');
    const currentVal = select.value;
    select.innerHTML = '<option value="SEMUA">Semua Mata Kuliah</option>';
    [...matkulSet].sort().forEach(mk => {
        const option = document.createElement('option');
        option.value = mk;
        option.textContent = mk;
        select.appendChild(option);
    });
    if ([...matkulSet].includes(currentVal)) select.value = currentVal;
    else select.value = 'SEMUA';
    currentFilter = select.value;
}

function getFilteredEntries() {
    if (currentFilter === 'SEMUA') return [...entries];
    return entries.filter(e => e.matkul === currentFilter);
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function renderEntries() {
    const container = document.getElementById('entriesContainer');
    const filtered = getFilteredEntries();
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-message">📭 Tidak ada catatan untuk filter ini.</div>`;
        return;
    }
    const sorted = [...filtered].reverse(); // tampilkan terbaru di atas
    let html = '';
    sorted.forEach(entry => {
        // cari index asli di array entries (untuk keperluan hapus)
        const originalIndex = entries.findIndex(e => 
            e.date === entry.date && e.matkul === entry.matkul && 
            e.description === entry.description && e.imageData === entry.imageData
        );
        const tanggalFormatted = formatTanggalIndonesia(entry.date);
        html += `
            <div class="entry-card" data-original-index="${originalIndex}">
                <div class="entry-thumb">
                    <img src="${entry.imageData || 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23d3dae3%22%2F%3E%3Ctext%20x%3D%2210%22%20y%3D%2255%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23333%22%3Eno image%3C%2Ftext%3E%3C%2Fsvg%3E'}" alt="foto">
                </div>
                <div class="entry-info">
                    <div>
                        <span class="entry-mata-kuliah">📚 ${escapeHTML(entry.matkul || 'Tanpa matkul')}</span>
                        <span class="entry-date-badge">📅 ${tanggalFormatted}</span>
                    </div>
                    <div class="entry-catatan">${escapeHTML(entry.description || '—')}</div>
                </div>
                <button class="delete-btn" onclick="hapusEntri(${originalIndex})">✕ Hapus</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Hapus entri (dipanggil dari tombol)
window.hapusEntri = async function(index) {
    if (index >= 0 && index < entries.length) {
        entries.splice(index, 1);
        await saveEntriesToGitHub(entries);
        rebuildFilterOptions();
        renderEntries();
        updateMatkulSuggest();
    }
};

// ==================== MODAL POPUP ====================
function showModal(entry) {
    document.getElementById('modalImage').src = entry.imageData || 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23d3dae3%22%2F%3E%3Ctext%20x%3D%2210%22%20y%3D%2255%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23333%22%3Eno image%3C%2Ftext%3E%3C%2Fsvg%3E';
    document.getElementById('modalMatkul').textContent = entry.matkul || 'Tanpa matkul';
    const tanggal = formatTanggalIndonesia(entry.date) + ' (' + (entry.day || getDayName(entry.date)) + ')';
    document.getElementById('modalTanggal').textContent = '🗓️ ' + tanggal;
    document.getElementById('modalDeskripsi').textContent = entry.description || '—';
    document.getElementById('entryModal').style.display = 'block';
}

// Tutup modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('entryModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target == document.getElementById('entryModal')) {
        document.getElementById('entryModal').style.display = 'none';
    }
});

// Event listener untuk klik pada kartu (delegasi)
document.getElementById('entriesContainer').addEventListener('click', (e) => {
    const card = e.target.closest('.entry-card');
    if (!card) return;
    // Jika yang diklik adalah tombol hapus, jangan buka modal
    if (e.target.classList.contains('delete-btn')) return;

    const index = card.getAttribute('data-original-index');
    if (index !== null && entries[index]) {
        showModal(entries[index]);
    }
});

// ==================== UPDATE DATALIST MATA KULIAH ====================
function updateMatkulSuggest() {
    const matkulSet = new Set(entries.map(e => e.matkul).filter(Boolean));
    const datalist = document.getElementById('matkulSuggest');
    datalist.innerHTML = '';
    [...matkulSet].sort().forEach(mk => {
        const option = document.createElement('option');
        option.value = mk;
        datalist.appendChild(option);
    });
}

// ==================== TAMBAH ENTRI BARU ====================
function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width, height = img.height;
            const maxDim = 1000;
            if (width > height) {
                if (width > maxDim) { height *= maxDim / width; width = maxDim; }
            } else {
                if (height > maxDim) { width *= maxDim / height; height = maxDim; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('imageUpload');
    const matkul = document.getElementById('matkulInput').value.trim();
    const desc = document.getElementById('description').value.trim();

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Pilih foto terlebih dahulu.'); return;
    }
    if (!matkul) {
        alert('Isi mata kuliah.'); return;
    }
    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('Ukuran maksimal 10MB.'); return;
    }

    const todayStr = getCurrentDateStr();
    const dayName = getDayName(todayStr);
    const quote = getDailyQuote(todayStr);

    resizeImage(file, async (dataURL) => {
        const newEntry = {
            date: todayStr,
            day: dayName,
            quote: quote,
            matkul: matkul,
            description: desc,
            imageData: dataURL
        };
        entries.push(newEntry);
        await saveEntriesToGitHub(entries);
        rebuildFilterOptions();
        document.getElementById('filterMatkul').value = 'SEMUA';
        currentFilter = 'SEMUA';
        renderEntries();
        updateMatkulSuggest();

        // Reset form
        fileInput.value = '';
        document.getElementById('matkulInput').value = '';
        document.getElementById('description').value = '';
    });
});

// ==================== FILTER EVENT ====================
document.getElementById('filterMatkul').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderEntries();
});

// ==================== BACKUP & RESTORE (tetap lokal) ====================
document.getElementById('backupBtn').addEventListener('click', () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logbook_backup_${getCurrentDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('restoreBtn').addEventListener('click', () => {
    document.getElementById('restoreFile').click();
});

document.getElementById('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const restored = JSON.parse(event.target.result);
            if (Array.isArray(restored)) {
                entries = restored;
                await saveEntriesToGitHub(entries);  // simpan ke GitHub
                rebuildFilterOptions();
                renderEntries();
                updateMatkulSuggest();
                alert('Restore berhasil!');
            } else {
                alert('File JSON tidak valid.');
            }
        } catch (err) {
            alert('Gagal membaca file: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
});

// ==================== EKSPOR PDF (dengan tanggal) ====================
document.getElementById('exportPdfBtn').addEventListener('click', function() {
    const filtered = getFilteredEntries();
    if (filtered.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
    }

    // Buat elemen clone untuk PDF
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.top = '0';
    cloneContainer.style.background = 'white';
    cloneContainer.style.padding = '1.8rem';
    cloneContainer.style.width = '800px';

    const style = document.createElement('style');
    style.textContent = `
        .entry-card {
            page-break-inside: avoid;
            border: 1px solid #0a2f44;
            margin-bottom: 1.2rem;
            background: #fefcf7;
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            padding: 1.3rem 1.8rem;
            border-radius: 28px;
        }
        .entry-thumb { flex: 0 0 180px; height: 180px; border-radius: 20px; overflow: hidden; border: 2px solid #bba88c; }
        .entry-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .entry-info { flex: 2; }
        .entry-mata-kuliah { background: #0a2f44; color: #fef3dd; padding: 0.3rem 1.4rem; border-radius: 40px; display: inline-block; margin-bottom: 0.3rem; }
        .entry-date-badge { background: #e8d7c0; padding: 0.2rem 1.2rem; border-radius: 40px; display: inline-block; margin-left: 0.5rem; }
        .entry-catatan { background: #f5e6d4; padding: 0.7rem 1.4rem; border-radius: 30px; margin-top: 0.5rem; }
    `;
    cloneContainer.appendChild(style);

    const sorted = [...filtered].reverse();
    sorted.forEach(entry => {
        const tanggalFormatted = formatTanggalIndonesia(entry.date);
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.innerHTML = `
            <div class="entry-thumb">
                <img src="${entry.imageData || 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23d3dae3%22%2F%3E%3Ctext%20x%3D%2210%22%20y%3D%2255%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23333%22%3Eno image%3C%2Ftext%3E%3C%2Fsvg%3E'}" alt="foto">
            </div>
            <div class="entry-info">
                <div>
                    <span class="entry-mata-kuliah">📚 ${escapeHTML(entry.matkul || 'Tanpa matkul')}</span>
                    <span class="entry-date-badge">📅 ${tanggalFormatted}</span>
                </div>
                <div class="entry-catatan">${escapeHTML(entry.description || '—')}</div>
            </div>
        `;
        cloneContainer.appendChild(card);
    });

    document.body.appendChild(cloneContainer);

    html2pdf().from(cloneContainer).set({
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `logbook_${getCurrentDateStr()}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 2, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).save().then(() => {
        document.body.removeChild(cloneContainer);
    });
});

// ==================== INISIALISASI APLIKASI ====================
(async function init() {
    renderTodayHeader();
    entries = await fetchEntriesFromGitHub();
    rebuildFilterOptions();
    renderEntries();
    updateMatkulSuggest();
})();
