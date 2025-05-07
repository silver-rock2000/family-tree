// Global variables
let jsPlumbInstance;
let familyData = [];
let scale = 1;
let isEditPage = window.location.href.includes('edit.html');

// Initialize when DOM is loaded
document.addEventListener('DOMLoaded', function() {
    initializePage();
});

// Fallback to window load if DOMLoaded doesn't fire
window.onload = function() {
    initializePage();
};

// Initialize the page based on whether it's the view or edit page
function initializePage() {
    // Set up jsPlumb
    jsPlumbInstance = jsPlumb.getInstance({
        Connector: ["Straight", { gap: 4, cornerRadius: 5, alwaysRespectStubs: true }],
        Endpoint: ["Dot", { radius: 2 }],
        HoverPaintStyle: { stroke: "#1e8151", strokeWidth: 2 },
        ConnectionOverlays: [
            ["Arrow", { location: 1, id: "arrow", width: 10, length: 10 }],
            ["Label", { label: "", id: "label", cssClass: "relationship-label" }]
        ]
    });

    // Initialize page-specific elements
    if (isEditPage) {
        initializeEditPage();
    } else {
        initializeViewPage();
    }

    // Load sample data initially
    loadSampleData();
    
    // Set up zoom controls
    setupZoomControls();
}

// Initialize View Page specific elements
function initializeViewPage() {
    // Set up modal functionality
    const modal = document.getElementById('personDetails');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = function() {
        modal.style.display = "none";
    };
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };
    
    // Set up load data button
    const loadDataBtn = document.getElementById('loadData');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', function() {
            // In a real application, this would load from Google Sheets
            // For now, we'll just reload sample data
            loadSampleData();
        });
    }
}

// Initialize Edit Page specific elements
function initializeEditPage() {
    // Set up form submission for adding people
    const addPersonForm = document.getElementById('addPersonForm');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addPerson();
        });
    }
    
    // Set up form submission for adding relationships
    const addRelationForm = document.getElementById('addRelationForm');
    if (addRelationForm) {
        addRelationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addRelationship();
        });
    }
    
    // Set up save data button
    const saveDataBtn = document.getElementById('saveData');
    if (saveDataBtn) {
        saveDataBtn.addEventListener('click', function() {
            saveData();
        });
    }
}

// Load sample family data
function loadSampleData() {
    // This would normally come from Google Sheets
    familyData = [
        { id: 1, name: "John Smith", birthYear: 1950, relations: [{ id: 2, type: "spouse" }, { id: 3, type: "parent" }] },
        { id: 2, name: "Mary Smith", birthYear: 1953, relations: [{ id: 1, type: "spouse" }, { id: 3, type: "parent" }] },
        { id: 3, name: "James Smith", birthYear: 1980, relations: [{ id: 1, type: "child" }, { id: 2, type: "child" }] }
    ];
    
    renderFamilyTree();
    
    // If on edit page, update the person dropdowns
    if (isEditPage) {
        updatePersonDropdowns();
    }
}

// Render the family tree
function renderFamilyTree() {
    // Clear existing tree
    const container = isEditPage ? document.getElementById('editContainer') : document.getElementById('treeContainer');
    container.innerHTML = '';
    
    // Reset jsPlumb
    jsPlumbInstance.reset();
    
    // Create person blocks
    familyData.forEach((person, index) => {
        const personEl = document.createElement('div');
        personEl.id = `person-${person.id}`;
        personEl.className = 'person';
        personEl.innerHTML = `
            <h3>${person.name}</h3>
            <p>Born: ${person.birthYear || 'Unknown'}</p>
            ${person.deathYear ? `<p>Died: ${person.deathYear}</p>` : ''}
        `;
        
        // Position the element (in a real app, you'd save positions)
        personEl.style.left = `${100 + (index % 3) * 250}px`;
        personEl.style.top = `${100 + Math.floor(index / 3) * 150}px`;
        
        container.appendChild(personEl);
        
        // Make element draggable
        jsPlumbInstance.draggable(personEl, {
            containment: container,
            stop: function() {
                // In a real app, you'd save the new position
            }
        });
        
        // Add click handler for view page
        if (!isEditPage) {
            personEl.addEventListener('click', function() {
                showPersonDetails(person);
            });
        }
    });
    
    // Create connections between people
    familyData.forEach(person => {
        if (person.relations) {
            person.relations.forEach(relation => {
                const sourceId = `person-${person.id}`;
                const targetId = `person-${relation.id}`;
                
                jsPlumbInstance.connect({
                    source: sourceId,
                    target: targetId,
                    anchor: ["Top", "Bottom", "Left", "Right"],
                    paintStyle: { stroke: getRelationshipColor(relation.type), strokeWidth: 2 },
                    overlays: [
                        ["Label", { label: relation.type, location: 0.5, cssClass: "relationship-label" }]
                    ]
                });
            });
        }
    });
}

// Show person details in modal
function showPersonDetails(person) {
    const modal = document.getElementById('personDetails');
    document.getElementById('modalName').innerText = person.name;
    document.getElementById('modalBirth').innerText = `Born: ${person.birthYear || 'Unknown'}`;
    
    if (person.deathYear) {
        document.getElementById('modalDeath').innerText = `Died: ${person.deathYear}`;
        document.getElementById('modalDeath').style.display = 'block';
    } else {
        document.getElementById('modalDeath').style.display = 'none';
    }
    
    document.getElementById('modalNotes').innerText = person.notes || 'No additional notes.';
    
    // Show relationships
    const relationsList = document.getElementById('modalRelations');
    relationsList.innerHTML = '';
    
    if (person.relations && person.relations.length > 0) {
        person.relations.forEach(relation => {
            const relatedPerson = familyData.find(p => p.id === relation.id);
            if (relatedPerson) {
                const li = document.createElement('li');
                li.innerText = `${relation.type} of ${relatedPerson.name}`;
                relationsList.appendChild(li);
            }
        });
    } else {
        const li = document.createElement('li');
        li.innerText = 'No relationships recorded.';
        relationsList.appendChild(li);
    }
    
    modal.style.display = "block";
}

// Add a new person (for edit page)
function addPerson() {
    const name = document.getElementById('personName').value;
    const birthYear = document.getElementById('birthYear').value ? parseInt(document.getElementById('birthYear').value) : null;
    const deathYear = document.getElementById('deathYear').value ? parseInt(document.getElementById('deathYear').value) : null;
    const notes = document.getElementById('notes').value;
    
    // Generate new ID (in real app, this would be more robust)
    const newId = familyData.length > 0 ? Math.max(...familyData.map(p => p.id)) + 1 : 1;
    
    // Add to data
    familyData.push({
        id: newId,
        name: name,
        birthYear: birthYear,
        deathYear: deathYear,
        notes: notes,
        relations: []
    });
    
    // Update UI
    renderFamilyTree();
    updatePersonDropdowns();
    
    // Reset form
    document.getElementById('addPersonForm').reset();
}

// Add a relationship between people (for edit page)
function addRelationship() {
    const person1Id = parseInt(document.getElementById('person1').value);
    const person2Id = parseInt(document.getElementById('person2').value);
    const relationType = document.getElementById('relationType').value;
    
    // Find the people
    const person1 = familyData.find(p => p.id === person1Id);
    const person2 = familyData.find(p => p.id === person2Id);
    
    if (!person1 || !person2) return;
    
    // Initialize relations arrays if they don't exist
    if (!person1.relations) person1.relations = [];
    if (!person2.relations) person2.relations = [];
    
    // Add appropriate relations based on type
    if (relationType === 'parent') {
        person1.relations.push({ id: person2Id, type: 'parent' });
        person2.relations.push({ id: person1Id, type: 'child' });
    } else if (relationType === 'child') {
        person1.relations.push({ id: person2Id, type: 'child' });
        person2.relations.push({ id: person1Id, type: 'parent' });
    } else if (relationType === 'spouse') {
        person1.relations.push({ id: person2Id, type: 'spouse' });
        person2.relations.push({ id: person1Id, type: 'spouse' });
    } else if (relationType === 'sibling') {
        person1.relations.push({ id: person2Id, type: 'sibling' });
        person2.relations.push({ id: person1Id, type: 'sibling' });
    }
    
    // Update UI
    renderFamilyTree();
    
    // Reset form
    document.getElementById('addRelationForm').reset();
}

// Update the person dropdown options (for edit page)
function updatePersonDropdowns() {
    const person1Select = document.getElementById('person1');
    const person2Select = document.getElementById('person2');
    
    if (!person1Select || !person2Select) return;
    
    // Clear existing options except the first one
    while (person1Select.options.length > 1) {
        person1Select.remove(1);
    }
    
    while (person2Select.options.length > 1) {
        person2Select.remove(1);
    }
    
    // Add options for each person
    familyData.forEach(person => {
        const option1 = document.createElement('option');
        option1.value = person.id;
        option1.textContent = person.name;
        person1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = person.id;
        option2.textContent = person.name;
        person2Select.appendChild(option2);
    });
}

// Save data (for edit page)
function saveData() {
    // In a real app, this would save to Google Sheets
    alert('In a real application, this would save your data to Google Sheets.\n\nFor now, the data is stored temporarily in memory.');
    
    // Here's where you would implement the Google Sheets API connection
    console.log('Data to save:', familyData);
}

// Set up zoom controls
function setupZoomControls() {
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const resetViewBtn = document.getElementById('resetView');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            scale += 0.1;
            applyZoom();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            scale -= 0.1;
            if (scale < 0.5) scale = 0.5;
            applyZoom();
        });
    }
    
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            scale = 1;
            applyZoom();
        });
    }
}

// Apply zoom to the tree container
function applyZoom() {
    const container = isEditPage ? document.getElementById('editContainer') : document.getElementById('treeContainer');
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';
    jsPlumbInstance.setZoom(scale);
}

// Get color for relationship line
function getRelationshipColor(type) {
    switch(type) {
        case 'spouse': return '#3a5a7d';
        case 'parent': return '#2ca02c';
        case 'child': return '#d62728';
        case 'sibling': return '#9467bd';
        default: return '#888888';
    }
}