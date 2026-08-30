class MuskleMap extends HTMLElement {
    connectedCallback() {
        this.viewMode = 'global'; 
        this.activeFilter = 'all'; 
        this.selectedCohort = 'all';
        
        this.map = null;
        this.institutions = [];
        this.visibleCities = [];
        this.availableYears = new Set();
        this.currentIndex = -1;
        this.hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 15 });
        
        this.userInteracting = false;
        this.spinEnabled = true;

        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        this.innerHTML = `
            <style>
                :host { display: block; width: 100%; }
                .muskle-map-wrapper { font-family: 'Montserrat', system-ui, sans-serif; max-width: 1800px; width: 96%; margin: 0 auto; color: #111827; }
                .muskle-header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
                .muskle-header-title { margin: 0; font-size: clamp(20px, 4vw + 0.5rem, 26px); font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1.2; }
                .muskle-controls-wrapper { margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
                .muskle-pills-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
                .muskle-pills-row::-webkit-scrollbar { display: none; }
                .muskle-pill { white-space: nowrap; padding: 8px 16px; border-radius: 20px; border: 1px solid #e5e7eb; background: #ffffff; cursor: pointer; transition: all 0.2s; font-family: inherit; font-weight: 600; font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .muskle-pill:hover { background: #f8fafc; border-color: #cbd5e1; }
                .muskle-pill.active { background: #111827; color: #ffffff; border-color: #111827; }
                .muskle-pill.active .pill-dot { border-color: #ffffff !important; }
                .pill-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
                .muskle-sub-controls { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
                .muskle-split-container { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; height: clamp(600px, 75vh, 900px); }
                .muskle-map-box { height: 100%; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); overflow: hidden; background: radial-gradient(circle at 50% 50%, #1e293b 0%, #000000 100%); }
                .muskle-map-viewport { width: 100%; height: 100%; }
                .muskle-panel-box { border-radius: 16px; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 10px 30px rgba(0,0,0,0.08); height: 100%; display: flex; flex-direction: column; overflow-y: auto; position: relative; }
                .muskle-panel-box::-webkit-scrollbar { width: 6px; }
                .muskle-panel-box::-webkit-scrollbar-track { background: transparent; }
                .muskle-panel-box::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
                .muskle-panel-box::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                .muskle-profile-card { background: #ffffff; padding: 24px 0; border-bottom: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 16px; }
                .muskle-profile-card:last-child { border-bottom: none; }
                .muskle-profile-header { display: flex; align-items: flex-start; gap: 24px; width: 100%; }
                .muskle-profile-avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; background: #f3f4f6; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .muskle-profile-details { flex: 1; min-width: 0; display: flex; flex-direction: column; }
                .muskle-profile-name { margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1B365D; letter-spacing: -0.5px; word-wrap: break-word; }
                .muskle-profile-inst { font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 8px; word-wrap: break-word; line-height: 1.4; }
                .muskle-profile-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
                .muskle-profile-body { width: 100%; }
                @media (max-width: 900px) {
                    .muskle-map-wrapper { width: 100%; padding: 0; }
                    .muskle-header-container, .muskle-controls-wrapper { padding: 0 16px; }
                    .muskle-split-container { display: flex; flex-direction: column; height: auto; gap: 0; }
                    .muskle-map-box { height: clamp(300px, 45vh, 550px); width: 100%; border-radius: 0; box-shadow: none; }
                    .muskle-panel-box { height: auto; overflow: visible; border-radius: 0; border-left: none; border-right: none; border-bottom: none; box-shadow: none; }
                    .muskle-profile-header { flex-direction: column; align-items: center; text-align: center; gap: 16px; }
                    .muskle-profile-details { align-items: center; }
                    .muskle-profile-tags { justify-content: center; }
                    .bio-text { text-align: justify !important; }
                    .muskle-profile-body { display: flex; flex-direction: column; align-items: center; }
                }
                
                /* Custom styles for the empty state select */
                .empty-select-wrapper { margin-top: 20px; width: 100%; max-width: 280px; position: relative; display: inline-block; }
                .empty-city-select {
                    width: 100%; padding: 12px 40px 12px 20px; border-radius: 25px; border: 1px solid #e5e7eb;
                    background: #ffffff; font-family: inherit; font-size: 14px; font-weight: 600; color: #1B365D;
                    outline: none; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.03); appearance: none;
                    transition: all 0.2s;
                }
                .empty-city-select:hover { border-color: #cbd5e1; box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
                .empty-select-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #6b7280; width: 16px; height: 16px; }
            </style>
            
            <div class="muskle-map-wrapper">
                <div class="muskle-header-container">
                    <h2 class="muskle-header-title">Summer School Network</h2>
                </div>
                <div class="muskle-controls-wrapper">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <span style="font-size: 12px; font-weight: 700; color: #1B365D; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 2px;">Views</span>
                        <div class="muskle-pills-row" id="mode-selector">
                            <button class="muskle-pill active" data-mode="global">🌐 Global</button>
                            <button class="muskle-pill" data-mode="background">🔬 Topic</button>
                            <button class="muskle-pill" data-mode="role">🎓 Role</button>
                        </div>
                    </div>
                    <div class="muskle-sub-controls">
                        <div class="muskle-pills-row sub-tabs" id="tabs-background" style="display: none;">
                            <button class="muskle-pill active" data-filter="all">All</button>
                            <button class="muskle-pill" data-filter="cell"><span class="pill-dot" style="background:#ea580c"></span>Cell</button>
                            <button class="muskle-pill" data-filter="tissue"><span class="pill-dot" style="background:#eab308"></span>Tissue</button>
                            <button class="muskle-pill" data-filter="organism"><span class="pill-dot" style="background:#38bdf8"></span>Organism</button>
                        </div>
                        <div class="muskle-pills-row sub-tabs" id="tabs-role" style="display: none;">
                            <button class="muskle-pill active" data-filter="all">All</button>
                            <button class="muskle-pill" data-filter="professor"><span class="pill-dot" style="background:#1d4ed8; border:1px solid #fff"></span>Professors</button>
                            <button class="muskle-pill" data-filter="student"><span class="pill-dot" style="background:#bae6fd; border:1px solid #0284c7"></span>Students</button>
                        </div>
                        <div class="sub-tabs" id="tabs-global" style="display: block; width: 10px;"></div>
                        <select id="filter-cohort" class="muskle-pill" style="outline: none; padding-right: 32px; background-image: url('data:image/svg+xml;utf8,<svg fill=%22none%22 stroke=%22%23475569%22 viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M19 9l-7 7-7-7%22></path></svg>'); background-repeat: no-repeat; background-position: right 12px center; background-size: 14px; appearance: none; -webkit-appearance: none;">
                            <option value="all">📅 All Cohorts</option>
                        </select>
                    </div>
                </div>
                <div class="muskle-split-container">
                    <div class="muskle-map-box">
                        <div id="muskle-map-container" class="muskle-map-viewport"></div>
                    </div>
                    <div id="muskle-panel-container" class="muskle-panel-box">
                        
                        <!-- NEW EMPTY STATE WITH DROPDOWN -->
                        <div id="info-empty" style="padding: 50px 20px; text-align: center; color: #475569; margin: auto;">
                            <div style="width: 64px; height: 64px; margin: 0 auto 20px auto; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 32px; height: 32px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                            </div>
                            <p style="font-size: 16px; font-weight: 500; margin: 0; line-height: 1.5;">Click on the map or select a city below<br>to explore the network.</p>
                            
                            <div class="empty-select-wrapper">
                                <select id="empty-city-select" class="empty-city-select">
                                    <option value="" disabled selected>Select a city...</option>
                                </select>
                                <svg class="empty-select-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div id="info-active" style="display: none; flex-direction: column;">
                            <div style="position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #f3f4f6; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px);">
                                <button id="btn-prev" style="width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; cursor: pointer; color: #1B365D; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                
                                <div style="position: relative; flex: 1; display: flex; justify-content: center; align-items: center; margin: 0 16px;">
                                    <h3 id="info-title-text" style="margin: 0; font-size: clamp(16px, 3.5vw, 20px); font-weight: 700; color: #111827; text-align: center; display: inline-flex; align-items: center; gap: 6px;">
                                        City, Country 
                                        <svg style="width:16px; height:16px; color:#6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                    </h3>
                                    <select id="info-title-select" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;"></select>
                                </div>

                                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                                    <button id="btn-next" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; cursor: pointer; color: #1B365D; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                        <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                    <button id="btn-close" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 50%; cursor: pointer; color: #dc2626; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                        <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <div id="info-content" style="padding: 10px 24px 30px 24px; display: flex; flex-direction: column;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.setupInteractions();
        this.initMap();
    }

    setupInteractions() {
        const modeButtons = this.querySelectorAll('#mode-selector .muskle-pill');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.viewMode = e.currentTarget.dataset.mode;
                this.activeFilter = 'all'; 
                this.querySelectorAll('.sub-tabs').forEach(el => el.style.display = 'none');
                this.querySelector(`#tabs-${this.viewMode}`).style.display = 'flex';
                this.querySelectorAll('.sub-tabs .muskle-pill').forEach(b => b.classList.remove('active'));
                this.querySelectorAll(`.sub-tabs#tabs-${this.viewMode} .muskle-pill[data-filter="all"]`).forEach(b => b.classList.add('active'));
                this.updateData();
            });
        });

        const filterButtons = this.querySelectorAll('.sub-tabs .muskle-pill');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.currentTarget.parentElement;
                parent.querySelectorAll('.muskle-pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.activeFilter = e.currentTarget.dataset.filter;
                this.updateData();
            });
        });

        this.querySelector('#filter-cohort').addEventListener('change', (e) => {
            this.selectedCohort = e.target.value;
            this.updateData();
        });

        // Event listener pour le menu "Empty State"
        this.querySelector('#empty-city-select').addEventListener('change', (e) => {
            if (e.target.value !== "") {
                this.currentIndex = parseInt(e.target.value, 10);
                this.selectCity(this.visibleCities[this.currentIndex], true);
            }
        });

        // Event listener pour le menu caché sous le Titre
        this.querySelector('#info-title-select').addEventListener('change', (e) => {
            this.currentIndex = parseInt(e.target.value, 10);
            this.selectCity(this.visibleCities[this.currentIndex], true);
        });

        this.querySelector('#btn-prev').addEventListener('click', () => this.navigate(-1));
        this.querySelector('#btn-next').addEventListener('click', () => this.navigate(1));
        this.querySelector('#btn-close').addEventListener('click', () => {
            this.resetPanel();
            this.map.flyTo({ center: [10.0, 40.0], zoom: this.baseZoom, duration: 2000 });
            this.spinEnabled = true;
        });

        const addScaleHover = (id) => {
            const btn = this.querySelector(id);
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        };
        addScaleHover('#btn-prev');
        addScaleHover('#btn-next');
        addScaleHover('#btn-close');
    }

    async initMap() {
        const container = this.querySelector('#muskle-map-container');
        const minDimension = Math.min(container.clientWidth || 600, container.clientHeight || 600);
        this.baseZoom = Math.max(0.5, Math.log2(minDimension / 512) + 0.8);

        this.map = new maplibregl.Map({
            container: container,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [10.0, 40.0],
            zoom: this.baseZoom,
            pitch: 0 
        });

        this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        
        this.map.on('style.load', () => {
            this.map.setProjection({ type: 'globe' });
            if (this.map.getLayer('water')) this.map.setPaintProperty('water', 'fill-color', '#0f172a');
            if (this.map.getLayer('background')) this.map.setPaintProperty('background', 'background-color', '#000000');
        });

        this.map.on('touchstart', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('mousedown', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('dragstart', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('zoomstart', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('mouseup', () => { this.userInteracting = false; });
        this.map.on('touchend', () => { this.userInteracting = false; });
        this.map.on('zoom', () => { requestAnimationFrame(() => this.renderClusters()); });

        const dataUrl = this.getAttribute('data-url') || './data.json';
        try {
            const response = await fetch(dataUrl);
            this.institutions = await response.json();
            
            this.institutions.forEach(inst => {
                inst.people.forEach(person => {
                    if (Array.isArray(person.year)) {
                        person.year.forEach(y => {
                            if (y) this.availableYears.add(y);
                        });
                    }
                });
            });
            this.populateSelects();

            this.map.on('load', () => {
                this.setupMapLayers();
                this.updateData();
                this.spinGlobe(); 
            });
        } catch (error) { console.error("Error loading map data:", error); }
    }

    populateSelects() {
        const selectCohort = this.querySelector('#filter-cohort');
        const sortedYears = Array.from(this.availableYears).sort().reverse();
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `📅 Cohort ${year}`;
            selectCohort.appendChild(option);
        });
    }

    spinGlobe() {
        if (this.spinEnabled && !this.userInteracting && this.map.getZoom() < 3) {
            const center = this.map.getCenter();
            center.lng += 0.015; 
            this.map.jumpTo({ center: center });
        }
        requestAnimationFrame(() => this.spinGlobe());
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    generateNetworkLines(nodes) {
        if (!nodes || nodes.length < 2) return [];
        const features = [];
        const unvisited = [...nodes];
        const visited = [];

        visited.push(unvisited.shift());

        while (unvisited.length > 0) {
            let minNode = null;
            let minTarget = null;
            let minDist = Infinity;
            let minIndex = -1;

            for (let i = 0; i < visited.length; i++) {
                for (let j = 0; j < unvisited.length; j++) {
                    const dist = this.calculateDistance(visited[i].lat, visited[i].lng, unvisited[j].lat, unvisited[j].lng);
                    if (dist < minDist) {
                        minDist = dist;
                        minNode = unvisited[j];
                        minTarget = visited[i];
                        minIndex = j;
                    }
                }
            }

            if (minNode && minTarget) {
                let lng1 = minTarget.lng;
                let lng2 = minNode.lng;

                if (Math.abs(lng1 - lng2) > 180) {
                    if (lng1 > lng2) { lng2 += 360; } else { lng2 -= 360; }
                }

                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [[lng1, minTarget.lat], [lng2, minNode.lat]] }
                });
                visited.push(minNode);
                unvisited.splice(minIndex, 1);
            } else {
                break;
            }
        }
        return features;
    }

    setupMapLayers() {
        this.map.addSource('world-countries', { type: 'geojson', data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson' });
        this.map.addLayer({ id: 'country-highlight-fill', type: 'fill', source: 'world-countries', filter: ['==', 'iso_a2', 'NONE'], paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 } });
        this.map.addLayer({ id: 'country-highlight-line', type: 'line', source: 'world-countries', filter: ['==', 'iso_a2', 'NONE'], paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.3 } });

        this.map.addSource('network-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        
        this.map.addLayer({ id: 'network-lines-glow', type: 'line', source: 'network-lines', paint: { 'line-color': '#cbd5e1', 'line-width': 4, 'line-opacity': 0.4, 'line-blur': 3 } });
        this.map.addLayer({ id: 'network-lines-base', type: 'line', source: 'network-lines', paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.8 } });

        this.map.addSource('institutions-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        this.map.addLayer({
            id: 'institutions-glow', type: 'circle', source: 'institutions-data',
            paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['+', ['get', 'radius'], 8], 'circle-opacity': 0.25, 'circle-blur': 1 }
        });

        this.map.addLayer({
            id: 'institutions-circles', type: 'circle', source: 'institutions-data',
            paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['get', 'radius'], 'circle-stroke-width': ['get', 'strokeWidth'], 'circle-stroke-color': ['get', 'strokeColor'] }
        });

        this.map.addLayer({
            id: 'institutions-labels', type: 'symbol', source: 'institutions-data',
            layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true },
            paint: { 'text-color': ['get', 'textColor'] } 
        });

        this.map.on('mouseenter', 'institutions-circles', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            const text = props.isCluster ? `${props.totalMembers} Members` : props.cityTitle;
            
            this.hoverPopup.setLngLat(e.features[0].geometry.coordinates.slice())
                .setHTML(`<div style="font-family:'Montserrat',sans-serif; font-weight:600; font-size:13px; color:#111827; padding:6px 10px; border-radius:6px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">${text}</div>`)
                .addTo(this.map);
        });
        
        this.map.on('mouseleave', 'institutions-circles', () => { this.map.getCanvas().style.cursor = ''; this.hoverPopup.remove(); });

        this.map.on('click', 'institutions-circles', (e) => {
            const props = e.features[0].properties;
            if (props.isCluster) {
                this.map.easeTo({ center: e.features[0].geometry.coordinates, zoom: this.map.getZoom() + 2 });
            } else {
                this.currentIndex = this.visibleCities.findIndex(c => c.title === props.cityTitle);
                if (this.currentIndex !== -1) {
                    this.spinEnabled = false; 
                    this.selectCity(this.visibleCities[this.currentIndex]);
                }
            }
        });
    }

    updateData() {
        if (!this.map || !this.map.getSource('institutions-data')) return;

        const cityMap = new Map();
        const activeCountries = new Set(); 

        this.institutions.forEach(inst => {
            if (inst.lat === 0 && inst.lng === 0) return;
            const filteredPeople = [];

            inst.people.forEach(person => {
                const role = person.role ? person.role.toLowerCase() : '';
                const bg = person.background ? person.background.toLowerCase() : '';
                
                const cohorts = Array.isArray(person.year) ? person.year : [];
                const matchCohort = (this.selectedCohort === 'all' || cohorts.includes(this.selectedCohort));
                
                let matchMode = true;

                if (this.viewMode === 'role' && this.activeFilter !== 'all') {
                    if (this.activeFilter === 'professor') matchMode = (role === 'professor' || role === 'professeur');
                    if (this.activeFilter === 'student') matchMode = (role === 'student' || role === 'étudiant');
                } else if (this.viewMode === 'background' && this.activeFilter !== 'all') {
                    matchMode = (bg === this.activeFilter);
                }

                if (matchCohort && matchMode) { filteredPeople.push(person); }
            });

            if (filteredPeople.length > 0) {
                const countryCodeStr = inst.country ? inst.country.toUpperCase() : 'Other';
                activeCountries.add(countryCodeStr);

                const cityStr = inst.city && inst.city !== 'Unknown City' ? inst.city : 'Unknown Location';
                const cityKey = inst.country ? `${cityStr}, ${countryCodeStr}` : cityStr;

                if (!cityMap.has(cityKey)) {
                    cityMap.set(cityKey, { title: cityKey, lat: inst.lat, lng: inst.lng, countryCode: countryCodeStr, totalMembers: 0, people: [] });
                }

                const cityGroup = cityMap.get(cityKey);
                cityGroup.totalMembers += filteredPeople.length;
                filteredPeople.forEach(p => { p.institutionName = inst.institution; cityGroup.people.push(p); });
            }
        });

        this.visibleCities = Array.from(cityMap.values()).sort((a, b) => a.title.localeCompare(b.title));
        
        // --- PEUPLEMENT DES MENUS DÉROULANTS PAR PAYS ---
        const selectElEmpty = this.querySelector('#empty-city-select');
        const selectElActive = this.querySelector('#info-title-select');
        
        selectElEmpty.innerHTML = '<option value="" disabled selected>Select a city...</option>';
        selectElActive.innerHTML = '';

        // Utilisation native de l'API Intl pour transformer "FR" en "France", "US" en "United States", etc.
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const groupedCities = {};

        this.visibleCities.forEach((city, idx) => {
            let countryName = 'International';
            if (city.countryCode && city.countryCode !== 'Other') {
                try { countryName = regionNames.of(city.countryCode) || city.countryCode; } 
                catch (e) { countryName = city.countryCode; }
            }
            if (!groupedCities[countryName]) groupedCities[countryName] = [];
            groupedCities[countryName].push({ city: city, originalIndex: idx });
        });

        // Tri alphabétique des pays
        const sortedCountries = Object.keys(groupedCities).sort();

        sortedCountries.forEach(country => {
            const optgroupEmpty = document.createElement('optgroup');
            optgroupEmpty.label = country;
            
            const optgroupActive = document.createElement('optgroup');
            optgroupActive.label = country;

            groupedCities[country].forEach(item => {
                const opt1 = document.createElement('option');
                opt1.value = item.originalIndex;
                opt1.textContent = item.city.title;
                optgroupEmpty.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = item.originalIndex;
                opt2.textContent = item.city.title;
                optgroupActive.appendChild(opt2);
            });

            selectElEmpty.appendChild(optgroupEmpty);
            selectElActive.appendChild(optgroupActive);
        });

        if (this.map.getLayer('country-highlight-fill')) {
            const matchExpression = ['match', ['get', 'iso_a2']];
            if (activeCountries.size > 0) {
                Array.from(activeCountries).forEach(code => matchExpression.push(code, true));
                matchExpression.push(false);
            } else {
                matchExpression.push('NONE', true, false);
            }
            this.map.setFilter('country-highlight-fill', matchExpression);
            this.map.setFilter('country-highlight-line', matchExpression);
        }

        this.renderClusters();

        if (this.currentIndex !== -1) {
            const currentCityTitle = this.querySelector('#info-title-text').innerText.replace(' ▾', '').trim();
            const newIndex = this.visibleCities.findIndex(c => c.title === currentCityTitle);
            if (newIndex !== -1) {
                this.currentIndex = newIndex;
                this.selectCity(this.visibleCities[this.currentIndex], false);
            } else {
                this.resetPanel(); 
            }
        }
    }

    renderClusters() {
        if (!this.map || !this.map.getSource('institutions-data')) return;

        const maxRadius = 25;
        const mergeRadius = maxRadius * 2 * 0.7; 
        const clusters = [];

        for (const city of this.visibleCities) {
            const pt = this.map.project([city.lng, city.lat]);
            let merged = false;

            for (const cluster of clusters) {
                const dist = Math.hypot(pt.x - cluster.pixel.x, pt.y - cluster.pixel.y);
                if (dist < mergeRadius) {
                    cluster.totalMembers += city.totalMembers;
                    cluster.cities.push(city);
                    merged = true;
                    break;
                }
            }

            if (!merged) {
                clusters.push({ lng: city.lng, lat: city.lat, pixel: pt, totalMembers: city.totalMembers, cities: [city] });
            }
        }

        const features = [];
        
        clusters.forEach(c => {
            const isCluster = c.cities.length > 1;
            const finalRadius = Math.min(Math.max(6, 6 + Math.sqrt(c.totalMembers) * 1.5), maxRadius); 
            
            let pointColor = '#ffffff'; 
            let strokeColor = '#cbd5e1';
            let strokeWidth = 1;

            if (this.viewMode === 'role') {
                if (this.activeFilter === 'professor') { pointColor = '#1d4ed8'; strokeColor = '#ffffff'; strokeWidth = 1.5; }
                else if (this.activeFilter === 'student') { pointColor = '#bae6fd'; strokeColor = '#0284c7'; strokeWidth = 1; }
            } else if (this.viewMode === 'background') {
                if (this.activeFilter === 'cell') { pointColor = '#ea580c'; strokeColor = '#ffffff'; strokeWidth = 1.5; }
                else if (this.activeFilter === 'tissue') { pointColor = '#eab308'; strokeColor = '#ffffff'; strokeWidth = 1.5; }
                else if (this.activeFilter === 'organism') { pointColor = '#38bdf8'; strokeColor = '#ffffff'; strokeWidth = 1.5; }
            }

            let fillColor = pointColor;
            let finalStrokeColor = strokeColor;
            let finalStrokeWidth = strokeWidth;
            let textColor = (pointColor === '#ffffff' || pointColor === '#bae6fd') ? '#111827' : '#ffffff';

            if (isCluster) {
                fillColor = 'rgba(15, 23, 42, 0.8)';
                finalStrokeColor = pointColor;
                finalStrokeWidth = Math.max(3, finalRadius * 0.25);
                textColor = '#ffffff';
            }

            let label = (isCluster || c.totalMembers > 1) ? c.totalMembers.toString() : '';

            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
                properties: {
                    isCluster: isCluster, cityTitle: isCluster ? 'Cluster' : c.cities[0].title,
                    totalMembers: c.totalMembers, radius: finalRadius,
                    color: fillColor, strokeColor: finalStrokeColor, strokeWidth: finalStrokeWidth, label: label,
                    textColor: textColor 
                }
            });
        });

        this.map.getSource('institutions-data').setData({ type: 'FeatureCollection', features: features });

        if (this.map.getSource('network-lines')) {
            const networkLines = this.generateNetworkLines(clusters);
            this.map.getSource('network-lines').setData({ type: 'FeatureCollection', features: networkLines });
        }
    }

    navigate(direction) {
        if (this.visibleCities.length === 0) return;
        this.currentIndex += direction;
        if (this.currentIndex < 0) this.currentIndex = this.visibleCities.length - 1;
        if (this.currentIndex >= this.visibleCities.length) this.currentIndex = 0;
        this.selectCity(this.visibleCities[this.currentIndex]);
    }

    selectCity(cityNode, moveMap = true) {
        this.querySelector('#info-empty').style.display = 'none';
        this.querySelector('#info-active').style.display = 'flex';
        
        this.querySelector('#info-title-text').innerHTML = `${cityNode.title} <svg style="width:16px; height:16px; color:#6b7280; margin-bottom:-2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>`;
        this.querySelector('#info-title-select').value = this.currentIndex;

        const content = this.querySelector('#info-content');
        
        const renderProfiles = (limit) => {
            content.innerHTML = ''; 
            const visiblePeople = cityNode.people.slice(0, limit);

            visiblePeople.forEach(person => {
                const card = document.createElement('div');
                card.className = 'muskle-profile-card';

                const imagePath = `images/${person.photo}`;
                let roleColor = '#1B365D';
                if (person.role && (person.role.toLowerCase() === 'student' || person.role.toLowerCase() === 'étudiant')) {
                    roleColor = '#38bdf8'; 
                }
                
                let roleDisplay = person.role === 'étudiant' ? 'Student' : person.role === 'professeur' ? 'Professor' : person.role ? person.role.charAt(0).toUpperCase() + person.role.slice(1) : '';

                let bgTag = '';
                if (person.background) {
                    const bgLower = person.background.toLowerCase();
                    let bgStyleColor = '#475569';
                    if (bgLower === 'cell') bgStyleColor = '#ea580c';
                    else if (bgLower === 'tissue') bgStyleColor = '#eab308';
                    else if (bgLower === 'organism') bgStyleColor = '#38bdf8';
                    
                    bgTag = `<span style="font-size: 12px; font-weight: 600; color: ${bgStyleColor}; padding: 4px 12px; border-radius: 20px; border: 1px solid ${bgStyleColor}40; background: ${bgStyleColor}10;">${person.background}</span>`;
                }

                let cohortTag = '';
                if (Array.isArray(person.year) && person.year.length > 0) {
                    const label = person.year.length > 1 ? 'Cohorts' : 'Cohort';
                    cohortTag = `<span style="font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; border: 1px solid #e2e8f0;">${label}: ${person.year.join(', ')}</span>`;
                }

                const instTag = person.institutionName ? `<div class="muskle-profile-inst">🏢 ${person.institutionName}</div>` : '';

                const hasBio = person.biosketch && person.biosketch.length > 0;
                const bioHtml = hasBio ? `
                    <div style="position: relative; margin-top: 12px;">
                        <p class="bio-text" style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; transition: all 0.3s ease; text-align: justify;">
                            ${person.biosketch}
                        </p>
                        <button class="bio-toggle" style="background: none; border: none; color: #3b82f6; font-size: 13px; font-weight: 600; padding: 0; margin-top: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit; justify-content: inherit;">
                            Read more <svg style="width:14px; height:14px; transition: transform 0.3s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                    </div>
                ` : '';

                const linkedinHtml = person.linkedin ? `
                    <a href="${person.linkedin}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-weight: 600; color: #0f172a; text-decoration: none; transition: all 0.2s; margin-top: 16px;">
                        <svg style="width: 16px; height: 16px; color: #0a66c2;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        LinkedIn Profile
                    </a>
                ` : '';

                card.innerHTML = `
                    <div class="muskle-profile-header">
                        <img class="muskle-profile-avatar" src="${imagePath}" alt="${person.firstName}" style="border: 3px solid ${roleColor};">
                        <div class="muskle-profile-details">
                            <h4 class="muskle-profile-name">${person.firstName} ${person.lastName}</h4>
                            ${instTag}
                            <div class="muskle-profile-tags">
                                ${roleDisplay ? `<span style="font-size: 12px; font-weight: 600; color: ${roleColor}; padding: 4px 12px; border-radius: 20px; border: 1px solid ${roleColor}40; background: ${roleColor}10;">${roleDisplay}</span>` : ''}
                                ${cohortTag}
                                ${bgTag}
                            </div>
                        </div>
                    </div>
                    <div class="muskle-profile-body">
                        ${bioHtml}
                        <div>${linkedinHtml}</div>
                    </div>
                `;

                if (hasBio) {
                    const toggleBtn = card.querySelector('.bio-toggle');
                    const bioText = card.querySelector('.bio-text');
                    let isExpanded = false;

                    if (person.biosketch.length < 160) {
                        toggleBtn.style.display = 'none';
                        bioText.style.webkitLineClamp = 'unset';
                    } else {
                        toggleBtn.addEventListener('click', () => {
                            isExpanded = !isExpanded;
                            if (isExpanded) {
                                bioText.style.webkitLineClamp = 'unset';
                                toggleBtn.innerHTML = `Show less <svg style="width:14px; height:14px; transform: rotate(180deg); transition: transform 0.3s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
                            } else {
                                bioText.style.webkitLineClamp = '3';
                                toggleBtn.innerHTML = `Read more <svg style="width:14px; height:14px; transition: transform 0.3s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
                            }
                        });
                    }
                }
                content.appendChild(card);
            });

            if (cityNode.people.length > limit) {
                const moreBtnContainer = document.createElement('div');
                moreBtnContainer.style.textAlign = 'center';
                moreBtnContainer.style.marginTop = '10px';
                
                const moreBtn = document.createElement('button');
                moreBtn.innerHTML = `View ${cityNode.people.length - limit} more members ▾`;
                moreBtn.style.cssText = 'background: #f1f5f9; border: 1px solid #e2e8f0; color: #1B365D; font-weight: 600; padding: 10px 24px; border-radius: 20px; cursor: pointer; transition: all 0.2s; font-family: inherit; font-size: 14px;';
                moreBtn.addEventListener('mouseenter', () => moreBtn.style.background = '#e2e8f0');
                moreBtn.addEventListener('mouseleave', () => moreBtn.style.background = '#f1f5f9');
                moreBtn.addEventListener('click', () => renderProfiles(cityNode.people.length));
                
                moreBtnContainer.appendChild(moreBtn);
                content.appendChild(moreBtnContainer);
            }
            this.querySelector('.muskle-panel-box').scrollTop = 0;
        };

        renderProfiles(3);

        if (moveMap) {
            const currentZoom = this.map.getZoom();
            const targetZoom = Math.max(currentZoom, 6); 
            this.map.flyTo({ center: [cityNode.lng, cityNode.lat], zoom: targetZoom, duration: 1500, essential: true });
        }
    }

    resetPanel() {
        this.currentIndex = -1;
        this.querySelector('#info-empty').style.display = 'block';
        this.querySelector('#info-active').style.display = 'none';
        this.querySelector('.muskle-panel-box').scrollTop = 0;
        
        // Remise à zéro du select "Empty State"
        const emptySelect = this.querySelector('#empty-city-select');
        if (emptySelect) emptySelect.value = "";
    }
}

customElements.define('muskle-map', MuskleMap);