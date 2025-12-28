// 国コードと名前のマッピング
const COUNTRY_NAMES = {
    'US': 'アメリカ',
    'NL': 'オランダ',
    'CH': 'スイス',
    'DE': 'ドイツ',
    'FI': 'フィンランド',
    'FR': 'フランス',
    'GB': '英国'
};

let allData = [];

// DOM要素の取得
const loadBtn = document.getElementById('loadBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const resultCountSpan = document.getElementById('resultCount');
const countryCheckboxes = document.querySelectorAll('.country-checkbox');
const selectAllCheckbox = document.getElementById('selectAll');
const deselectAllCheckbox = document.getElementById('deselectAll');
const dataTimestampSpan = document.getElementById('dataTimestamp');

// ステータス表示
function setStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// データの更新日時を取得して表示
async function updateDataTimestamp() {
    try {
        const response = await fetch('./data/metadata.json');
        const metadata = await response.json();
        
        if (metadata.lastUpdated) {
            const date = new Date(metadata.lastUpdated);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            dataTimestampSpan.textContent = `${year}年${month}月${day}日 ${hours}時${minutes}分`;
            dataTimestampSpan.style.color = '#059669';
            dataTimestampSpan.style.fontWeight = '600';
        } else {
            dataTimestampSpan.textContent = 'データ未取得';
            dataTimestampSpan.style.color = '#dc2626';
            dataTimestampSpan.style.fontWeight = '600';
        }
    } catch (error) {
        console.error('タイムスタンプ取得エラー:', error);
        dataTimestampSpan.textContent = '不明';
        dataTimestampSpan.style.color = '#6b7280';
    }
}

// データ読み込み
async function loadData() {
    setStatus('データを読み込み中...', 'loading');
    loadBtn.disabled = true;

    try {
        const response = await fetch('./data/unogs-data.json');
        if (!response.ok) {
            throw new Error(`データの読み込みに失敗しました: ${response.status}`);
        }
        
        allData = await response.json();
        setStatus(`データ読み込み完了: ${allData.length}件`, 'success');
        applyFilters();
        
        // 更新日時を更新
        await updateDataTimestamp();
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ読み込みエラー:', error);
    } finally {
        loadBtn.disabled = false;
    }
}

// フィルター適用
function applyFilters() {
    const selectedCountries = Array.from(countryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedCountries.length === 0) {
        displayResults([]);
        return;
    }

    // 選択された国のいずれかで視聴可能な作品をフィルタリング
    // 重複を防ぐため、Setを使用
    const uniqueWorkIds = new Set();
    const filteredWorks = [];

    allData.forEach(work => {
        if (!work.countries || !Array.isArray(work.countries)) return;
        
        const hasSelectedCountry = work.countries.some(country => {
            const countryCode = typeof country === 'object' ? country.code : country;
            return selectedCountries.includes(countryCode);
        });

        if (hasSelectedCountry && !uniqueWorkIds.has(work.id || work.title)) {
            uniqueWorkIds.add(work.id || work.title);
            filteredWorks.push(work);
        }
    });

    displayResults(filteredWorks);
}

// 結果を表示
function displayResults(works) {
    resultCountSpan.textContent = works.length;

    if (works.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">該当する作品が見つかりませんでした<br>フィルター条件を変更してください</p>';
        return;
    }

    // 評価順（降順）、次に年順（降順）でソート
    const sortedWorks = [...works].sort((a, b) => {
        // 評価でソート（高い方が先）
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        if (ratingB !== ratingA) {
            return ratingB - ratingA;
        }
        
        // 評価が同じ場合は年でソート（新しい方が先）
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
    });

    resultsDiv.innerHTML = sortedWorks.map(work => {
        const countries = (work.countries || []).map(country => {
            const countryCode = typeof country === 'object' ? country.code : country;
            const countryName = COUNTRY_NAMES[countryCode] || countryCode;
            return `<span class="country-tag">${countryName}</span>`;
        }).join('');

        // 画像URL
        const imageUrl = work.image || work.imageUrl || '';
        const imageHtml = imageUrl 
            ? `<img src="${imageUrl}" alt="${work.title}" class="result-image" onerror="this.style.display='none'">` 
            : '<div class="result-image no-image">画像なし</div>';

        // タイトル表示
        let titleDisplay = work.title;
        const titleJa = work.titleJa || work.japaneseTitle || '';
        if (titleJa) {
            // タイトルに既に日本語が含まれているかチェック
            if (work.title.includes(titleJa)) {
                titleDisplay = work.title;
            } else {
                titleDisplay = `${work.title} (${titleJa})`;
            }
        }

        // 概要表示（13文字×2行）
        const synopsis = work.synopsisJa || work.synopsisJapanese || work.synopsis || '';
        const shortSynopsis = synopsis.substring(0, 26);
        const displaySynopsis = synopsis.length > 26 
            ? shortSynopsis.substring(0, 13) + '\n' + shortSynopsis.substring(13, 26) + '...'
            : shortSynopsis.substring(0, 13) + '\n' + shortSynopsis.substring(13);

        // 評価表示
        const ratingHtml = work.rating 
            ? `<div class="result-rating">⭐ ${work.rating}</div>` 
            : '';

        return `
            <div class="result-card" data-work-id="${work.id || work.title}">
                ${imageHtml}
                <div class="result-content">
                    <h3 class="result-title">${titleDisplay}</h3>
                    <div class="result-meta">
                        <span class="meta-type">${work.type || 'Unknown'}</span>
                        <span class="meta-year">${work.year || 'N/A'}</span>
                        ${ratingHtml}
                    </div>
                    <p class="result-synopsis" style="white-space: pre-wrap; word-break: break-all; max-height: 3.5em; overflow: hidden; line-height: 1.5em;">${displaySynopsis}</p>
                    <div class="result-countries">${countries}</div>
                </div>
            </div>
        `;
    }).join('');

    // カードクリックで詳細モーダルを表示
    document.querySelectorAll('.result-card').forEach(card => {
        card.addEventListener('click', function() {
            const workId = this.getAttribute('data-work-id');
            const work = sortedWorks.find(w => (w.id || w.title) === workId);
            if (work) {
                openDetailModal(work);
            }
        });
    });
}

// 詳細モーダルを開く
function openDetailModal(item) {
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSynopsis = document.getElementById('modalSynopsis');

    // タイトル表示
    let titleDisplay = item.title;
    const titleJa = item.titleJa || item.japaneseTitle || '';
    if (titleJa) {
        if (item.title.includes(titleJa)) {
            titleDisplay = item.title;
        } else {
            titleDisplay = `${item.title} (${titleJa})`;
        }
    }
    
    modalTitle.textContent = titleDisplay;
    
    // 全文表示（synopsisJaFull → synopsisJapanese → synopsis の優先順位）
    const fullSynopsis = item.synopsisJaFull || item.synopsisJapanese || item.synopsis || '概要はありません';
    modalSynopsis.textContent = fullSynopsis;

    modal.style.display = 'block';
}

// 詳細モーダルを閉じる
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
}

// モーダルの外側クリックで閉じる
window.addEventListener('click', function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeDetailModal();
    }
});

// 全て選択
function selectAllCountries() {
    countryCheckboxes.forEach(cb => cb.checked = true);
    applyFilters();
}

// 全て解除
function deselectAllCountries() {
    countryCheckboxes.forEach(cb => cb.checked = false);
    applyFilters();
}

// イベントリスナー
loadBtn.addEventListener('click', loadData);

// 全て選択/解除のチェックボックス
selectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        deselectAllCheckbox.checked = false;
        selectAllCountries();
    }
});

deselectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        selectAllCheckbox.checked = false;
        deselectAllCountries();
    }
});

// 国フィルターの変更を監視
countryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});

// モーダルの閉じるボタン
document.querySelector('.close-button').addEventListener('click', closeDetailModal);

// ページ読み込み時に自動的にデータを読み込む
window.addEventListener('DOMContentLoaded', async () => {
    console.log('ページ読み込み完了、データを自動読み込みします');
    await loadData();
});
