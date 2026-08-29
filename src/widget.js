class MuskleMap extends HTMLElement {
    connectedCallback() {
        this.showStudents = true;
        this.showProfessors = true;
        this.selectedCohort = 'all';
        this.selectedBackground = 'all';
        this.map = null;
        this.institutions = [];
        this.visibleCities = [];
        this.availableYears = new Set();
        this.availableBackgrounds = new Set();
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
                .muskle-map-wrapper { font-family: 'Montserrat', system-ui, sans-serif; max-width: 1200px; margin: 0 auto; color: #111827; }
                
                .muskle-header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
                .muskle-header-title { margin: 0; font-size: clamp(20px, 4vw + 0.5rem, 26px); font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1.2; }
                
                .muskle-split-container {
                    display: grid;
                    grid-template-columns: 1.3fr 1fr;
                    gap: 24px;
                    height: clamp(600px, 75vh, 900px);
                }
                
                .muskle-map-box {
                    height: 100%; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    overflow: hidden; background: radial-gradient(circle at 50% 50%, #1e293b 0%, #000000 100%);
                }
                .muskle-map-viewport { width: 100%; height: 100%; }
                
                .muskle-panel-box {
                    border-radius: 16px; background: #ffffff; border: 1px solid #e5e7eb;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    height: 100%; display: flex; flex-direction: column; overflow-y: auto;
                    position: relative;
                }
                
                .muskle-panel-box::-webkit-scrollbar { width: 6px; }
                .muskle-panel-box::-webkit-scrollbar-track { background: transparent; }
                .muskle-panel-box::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
                .muskle-panel-box::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                .muskle-profile-card {
                    background: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb;
                    display: flex; flex-direction: column; gap: 16px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .muskle-profile-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
                
                .muskle-profile-header { display: flex; align-items: flex-start; gap: 24px; width: 100%; }
                .muskle-profile-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; background: #f3f4f6; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .muskle-profile-details { flex: 1; min-width: 0; display: flex; flex-direction: column; }
                .muskle-profile-name { margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1B365D; letter-spacing: -0.5px; word-wrap: break-word; }
                .muskle-profile-inst { font-size: 13px; font-weight: 500; color: #1B365D; margin-bottom: 8px; word-wrap: break-word; line-height: 1.4; }
                .muskle-profile-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
                .muskle-profile-body { width: 100%; }
                
                @media (max-width: 900px) {
                    .muskle-split-container { display: flex; flex-direction: column; height: auto; }
                    .muskle-map-box { height: clamp(300px, 45vh, 550px); width: 100%; }
                    .muskle-panel-box { height: auto; overflow: visible; }
                    
                    .muskle-profile-header { flex-direction: column; align-items: center; text-align: center; gap: 16px; }
                    .muskle-profile-details { align-items: center; }
                    .muskle-profile-tags { justify-content: center; }
                    .bio-text { text-align: center !important; }
                    .muskle-profile-body { display: flex; flex-direction: column; align-items: center; }
                }
            </style>
            
            <div class="muskle-map-wrapper">
                <div class="muskle-header-container">
                    <h2 class="muskle-header-title">Summer School Network</h2>
                    
                    <div style="position: relative;">
                        <button id="btn-toggle-filters" style="display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; padding: 10px 16px; cursor: pointer; font-size: 14px; font-weight: 600; color: #1B365D; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s;">
                            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                            Filters
                        </button>
                        
                        <div id="filter-dropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 10px); background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 260px; padding: 20px; z-index: 10;">
                            <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Role</h4>
                            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                                <label style="cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="filter-students" checked style="width:16px; height:16px; accent-color:#F2A900; cursor:pointer;">
                                    <span style="width: 12px; height: 12px; border-radius: 50%; background: #F2A900; display: inline-block;"></span>
                                    Students
                                </label>
                                <label style="cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="filter-professors" checked style="width:16px; height:16px; accent-color:#1B365D; cursor:pointer;">
                                    <span style="width: 12px; height: 12px; border-radius: 50%; background: #1B365D; display: inline-block;"></span>
                                    Professors
                                </label>
                            </div>
                            <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Background</h4>
                            <select id="filter-background" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; font-family: inherit; color: #111827; background: #f9fafb; outline: none; cursor: pointer; margin-bottom: 20px;">
                                <option value="all">All Backgrounds</option>
                            </select>
                            <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Cohort Year</h4>
                            <select id="filter-cohort" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; font-family: inherit; color: #111827; background: #f9fafb; outline: none; cursor: pointer;">
                                <option value="all">All Cohorts</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="muskle-split-container">
                    <div class="muskle-map-box">
                        <div id="muskle-map-container" class="muskle-map-viewport"></div>
                    </div>

                    <div id="muskle-panel-container" class="muskle-panel-box">
                        <div id="info-empty" style="padding: 50px 20px; text-align: center; color: #6b7280; margin: auto;">
                            <div style="width: 64px; height: 64px; margin: 0 auto 20px auto; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 32px; height: 32px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                            </div>
                            <p style="font-size: 16px; font-weight: 400; margin: 0;">Select a location on the map to discover the members of the Muskle network.</p>
                        </div>

                        <div id="info-active" style="display: none; flex-direction: column;">
                            <div style="position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #f3f4f6; background: rgba(249, 250, 251, 0.95); backdrop-filter: blur(4px);">
                                <button id="btn-prev" style="width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; cursor: pointer; color: #1B365D; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <h3 id="info-title" style="margin: 0; font-size: clamp(18px, 4vw, 22px); font-weight: 700; color: #111827; text-align: center; flex: 1; padding: 0 16px; line-height: 1.2;">City, Country</h3>
                                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                                    <button id="btn-next" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 50%; cursor: pointer; color: #1B365D; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                        <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                    <button id="btn-close" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 50%; cursor: pointer; color: #dc2626; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: all 0.2s;">
                                        <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <div id="info-content" style="padding: 24px 20px; display: flex; flex-direction: column; gap: 20px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupInteractions();
        this.initMap();
    }

    setupInteractions() {
        const btnToggle = this.querySelector('#btn-toggle-filters');
        const dropdown = this.querySelector('#filter-dropdown');

        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            btnToggle.style.background = isVisible ? '#ffffff' : '#f3f4f6';
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btnToggle) {
                dropdown.style.display = 'none';
                btnToggle.style.background = '#ffffff';
            }
        });

        this.querySelector('#filter-students').addEventListener('change', (e) => {
            this.showStudents = e.target.checked;
            this.updateData();
        });

        this.querySelector('#filter-professors').addEventListener('change', (e) => {
            this.showProfessors = e.target.checked;
            this.updateData();
        });

        this.querySelector('#filter-cohort').addEventListener('change', (e) => {
            this.selectedCohort = e.target.value;
            this.updateData();
        });

        this.querySelector('#filter-background').addEventListener('change', (e) => {
            this.selectedBackground = e.target.value;
            this.updateData();
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
        // Adjusted the base offset (+0.8 instead of -0.2) to make the globe fill the viewport better
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

        this.map.on('mousedown', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('dragstart', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('zoomstart', () => { this.userInteracting = true; this.spinEnabled = false; });
        this.map.on('mouseup', () => { this.userInteracting = false; });
        this.map.on('touchend', () => { this.userInteracting = false; });

        this.map.on('zoom', () => {
            requestAnimationFrame(() => this.renderClusters());
        });

        const dataUrl = this.getAttribute('data-url') || './data.json';
        try {
            const response = await fetch(dataUrl);
            this.institutions = await response.json();
            
            this.institutions.forEach(inst => {
                inst.people.forEach(person => {
                    if (person.year) this.availableYears.add(person.year);
                    if (person.background) this.availableBackgrounds.add(person.background);
                });
            });
            this.populateSelects();

            this.map.on('load', () => {
                this.setupMapLayers();
                this.updateData();
                this.spinGlobe(); 
            });
        } catch (error) {
            console.error("Error loading map data:", error);
        }
    }

    populateSelects() {
        const selectCohort = this.querySelector('#filter-cohort');
        const sortedYears = Array.from(this.availableYears).sort().reverse();
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectCohort.appendChild(option);
        });

        const selectBg = this.querySelector('#filter-background');
        const sortedBgs = Array.from(this.availableBackgrounds).sort((a, b) => a.localeCompare(b));
        sortedBgs.forEach(bg => {
            const option = document.createElement('option');
            option.value = bg;
            option.textContent = bg;
            selectBg.appendChild(option);
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
        const features = [];
        nodes.forEach(nodeA => {
            let distances = nodes
                .filter(nodeB => (nodeA.lng !== nodeB.lng || nodeA.lat !== nodeB.lat))
                .map(nodeB => ({
                    target: nodeB,
                    dist: this.calculateDistance(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng)
                }))
                .sort((a, b) => a.dist - b.dist);

            distances.slice(0, 2).forEach(link => {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [[nodeA.lng, nodeA.lat], [link.target.lng, link.target.lat]] }
                });
            });
        });
        return features;
    }

    setupMapLayers() {
        this.map.addSource('world-countries', {
            type: 'geojson',
            data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson'
        });

        this.map.addLayer({
            id: 'country-highlight-fill',
            type: 'fill',
            source: 'world-countries',
            filter: ['==', 'iso_a2', 'NONE'], 
            paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.1 }
        });

        this.map.addLayer({
            id: 'country-highlight-line',
            type: 'line',
            source: 'world-countries',
            filter: ['==', 'iso_a2', 'NONE'],
            paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.5 }
        });

        this.map.addSource('network-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        this.map.addLayer({
            id: 'network-lines-base',
            type: 'line',
            source: 'network-lines',
            paint: { 'line-color': '#cbd5e1', 'line-width': 1.5, 'line-opacity': 0.3 }
        });

        this.map.addSource('institutions-data', { 
            type: 'geojson', 
            data: { type: 'FeatureCollection', features: [] }
        });

        this.map.addLayer({
            id: 'institutions-glow',
            type: 'circle',
            source: 'institutions-data',
            paint: { 
                'circle-color': ['get', 'color'], 
                'circle-radius': ['+', ['get', 'radius'], 6], 
                'circle-opacity': 0.3, 
                'circle-blur': 1 
            }
        });

        this.map.addLayer({
            id: 'institutions-circles',
            type: 'circle',
            source: 'institutions-data',
            paint: { 
                'circle-color': ['get', 'color'], 
                'circle-radius': ['get', 'radius'], 
                'circle-stroke-width': ['get', 'strokeWidth'], 
                'circle-stroke-color': ['get', 'strokeColor'] 
            }
        });

        this.map.addLayer({
            id: 'institutions-labels',
            type: 'symbol',
            source: 'institutions-data',
            layout: { 
                'text-field': ['get', 'label'], 
                'text-size': 13, 
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 
                'text-allow-overlap': true 
            },
            paint: { 'text-color': '#ffffff' }
        });

        this.map.on('mouseenter', 'institutions-circles', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            const text = props.isCluster ? `${props.totalMembers} Members in this area` : props.cityTitle;
            
            this.hoverPopup.setLngLat(e.features[0].geometry.coordinates.slice())
                .setHTML(`<div style="font-family:'Montserrat',sans-serif; font-weight:600; font-size:13px; color:#111827; padding:6px 10px; border-radius:6px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">${text}</div>`)
                .addTo(this.map);
        });
        
        this.map.on('mouseleave', 'institutions-circles', () => {
            this.map.getCanvas().style.cursor = '';
            this.hoverPopup.remove();
        });

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

            let studentCount = 0;
            let profCount = 0;
            const filteredPeople = [];

            inst.people.forEach(person => {
                const isStudent = person.role === 'student' || person.role === 'étudiant';
                const isProf = person.role === 'professor' || person.role === 'professeur';
                
                const matchCohort = (this.selectedCohort === 'all' || person.year === this.selectedCohort);
                const matchBackground = (this.selectedBackground === 'all' || person.background === this.selectedBackground);

                if (matchCohort && matchBackground) {
                    if (isStudent && this.showStudents) { studentCount++; filteredPeople.push(person); }
                    if (isProf && this.showProfessors) { profCount++; filteredPeople.push(person); }
                }
            });

            if (filteredPeople.length > 0) {
                if (inst.country) activeCountries.add(inst.country.toUpperCase());

                const cityStr = inst.city && inst.city !== 'Unknown City' ? inst.city : 'Unknown Location';
                const countryStr = inst.country ? inst.country : '';
                const cityKey = countryStr ? `${cityStr}, ${countryStr}` : cityStr;

                if (!cityMap.has(cityKey)) {
                    cityMap.set(cityKey, {
                        title: cityKey,
                        lat: inst.lat,
                        lng: inst.lng,
                        studentCount: 0,
                        profCount: 0,
                        totalMembers: 0,
                        people: []
                    });
                }

                const cityGroup = cityMap.get(cityKey);
                cityGroup.studentCount += studentCount;
                cityGroup.profCount += profCount;
                cityGroup.totalMembers += filteredPeople.length;
                
                filteredPeople.forEach(p => {
                    p.institutionName = inst.institution;
                    cityGroup.people.push(p);
                });
            }
        });

        this.visibleCities = Array.from(cityMap.values()).sort((a, b) => a.title.localeCompare(b.title));
        
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
            const currentCityTitle = this.querySelector('#info-title').innerText;
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

        const mergeRadius = 45; 
        const clusters = [];

        for (const city of this.visibleCities) {
            const pt = this.map.project([city.lng, city.lat]);
            let merged = false;

            for (const cluster of clusters) {
                const dist = Math.hypot(pt.x - cluster.pixel.x, pt.y - cluster.pixel.y);
                if (dist < mergeRadius) {
                    cluster.studentCount += city.studentCount;
                    cluster.profCount += city.profCount;
                    cluster.totalMembers += city.totalMembers;
                    cluster.cities.push(city);
                    merged = true;
                    break;
                }
            }

            if (!merged) {
                clusters.push({
                    lng: city.lng,
                    lat: city.lat,
                    pixel: pt,
                    studentCount: city.studentCount,
                    profCount: city.profCount,
                    totalMembers: city.totalMembers,
                    cities: [city]
                });
            }
        }

        const features = [];
        
        clusters.forEach(c => {
            const isCluster = c.cities.length > 1;
            
            let pointColor = '#1B365D'; 
            let strokeColor = '#ffffff';
            let strokeWidth = 2;

            const baseRadius = Math.min(Math.max(12, 10 + (c.totalMembers * 2)), 30);
            const finalRadius = isCluster ? baseRadius + 4 : baseRadius; 

            if (c.studentCount > 0 && c.profCount === 0) {
                pointColor = '#F2A900'; 
            } else if (c.studentCount > 0 && c.profCount > 0) {
                pointColor = '#1B365D';
                strokeColor = '#F2A900'; 
                strokeWidth = Math.max(4, finalRadius * 0.25); 
            }

            let label = '';
            if (isCluster || c.totalMembers > 1) {
                label = c.totalMembers.toString();
            }

            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
                properties: {
                    isCluster: isCluster,
                    cityTitle: isCluster ? 'Cluster' : c.cities[0].title,
                    studentCount: c.studentCount,
                    profCount: c.profCount,
                    totalMembers: c.totalMembers,
                    radius: finalRadius,
                    color: pointColor,
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth,
                    label: label
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
        this.querySelector('#info-title').innerText = cityNode.title;
        
        const content = this.querySelector('#info-content');
        
        const renderProfiles = (limit) => {
            content.innerHTML = ''; 
            const visiblePeople = cityNode.people.slice(0, limit);

            visiblePeople.forEach(person => {
                const card = document.createElement('div');
                card.className = 'muskle-profile-card';

                const imagePath = `images/${person.photo}`;
                const roleColor = (person.role === 'student' || person.role === 'étudiant') ? '#F2A900' : '#1B365D';
                
                let roleDisplay = person.role === 'étudiant' ? 'Student' : 
                                  person.role === 'professeur' ? 'Professor' : 
                                  person.role.charAt(0).toUpperCase() + person.role.slice(1);

                const bgTag = person.background ? `<span style="font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; border: 1px solid #e2e8f0;">Background: ${person.background}</span>` : '';
                const cohortTag = person.year ? `<span style="font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; border: 1px solid #e2e8f0;">Cohort: ${person.year}</span>` : '';

                const instTag = person.institutionName ? `<div class="muskle-profile-inst">🏢 ${person.institutionName}</div>` : '';

                const hasBio = person.biosketch && person.biosketch.length > 0;
                const bioHtml = hasBio ? `
                    <div style="position: relative; margin-top: 12px;">
                        <p class="bio-text" style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; transition: all 0.3s ease; text-align: left;">
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

                // Refactored structure to let Bio text span full width
                card.innerHTML = `
                    <div class="muskle-profile-header">
                        <img class="muskle-profile-avatar" src="${imagePath}" alt="${person.firstName}" style="border: 3px solid ${roleColor};">
                        <div class="muskle-profile-details">
                            <h4 class="muskle-profile-name">${person.firstName} ${person.lastName}</h4>
                            ${instTag}
                            <div class="muskle-profile-tags">
                                <span style="font-size: 12px; font-weight: 600; color: ${roleColor}; padding: 4px 12px; border-radius: 20px; border: 1px solid ${roleColor}40; background: ${roleColor}10;">
                                    ${roleDisplay}
                                </span>
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
    }
}

customElements.define('muskle-map', MuskleMap);