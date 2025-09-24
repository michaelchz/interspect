class InfoCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const cardTemplate = document.createElement('template');
        cardTemplate.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .card {
                    background-color: var(--card-bg);
                    border-radius: 8px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }
                
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .card-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--secondary-color);
                }
                
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed var(--border-color);
                }

                .stat-item:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                
                .stat-label {
                    color: #ccc;
                }
                
                .stat-value {
                    font-weight: 600;
                    color: var(--primary-color);
                }
            </style>
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${this.getAttribute('title')}</div>
                </div>
                <div id="items-container"></div>
            </div>
        `;
        this.shadowRoot.appendChild(cardTemplate.content.cloneNode(true));
    }

    setData(items) {
        const container = this.shadowRoot.querySelector('#items-container');
        container.innerHTML = ''; // Clear existing items
        if (!items) return;
        items.forEach(item => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <div class="stat-label">${item.label}</div>
                <div class="stat-value">${item.value}</div>
            `;
            container.appendChild(statItem);
        });
    }
}

customElements.define('info-card', InfoCard);
