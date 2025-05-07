// Global variables
let jsPlumbInstance;
let familyData = [];
let scale = 1;
let isEditPage = window.location.href.includes('edit.html');

// Fix jsPlumb initialization issue
function fixJsPlumbInitialization() {
    // JsPlumb sometimes has issues with initialization timing, this helps ensure proper init
    setTimeout(function() {
        if (jsPlumbInstance) {
            jsPlumbInstance.repaintEverything();
        }
    }, 500);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    fixJsPlumbInitialization();
});

// Fallback to window load if DOMContentLoaded doesn't fire
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

    // Try to load data from localStorage first
    if (!loadFromLocalStorage()) {
        // If no saved data exists, load sample data
        loadSampleData();
    }
    
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
            // Try to load from localStorage, or fall back to sample data
            if (!loadFromLocalStorage()) {
                loadSampleData();
                alert('No saved data found. Loaded sample data instead.');
            } else {
                alert('Family tree data loaded successfully!');
            }
        });
    }
    
    // Set up export JSON button
    const exportJSONBtn = document.getElementById('exportJSON');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', function() {
            exportToJSON();
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
            saveToLocalStorage();
        });
    }
    
    // Set up export JSON button
    const exportJSONBtn = document.getElementById('exportJSON');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', function() {
            exportToJSON();
        });
    }
    
    // Set up import JSON button
    const importJSONInput = document.getElementById('importJSON');
    if (importJSONInput) {
        importJSONInput.addEventListener('change', function(event) {
            importFromJSON(event);
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

// Save data to localStorage
function saveToLocalStorage() {
    try {
        // Save the family data
        localStorage.setItem('familyTreeData', JSON.stringify(familyData));
        
        // Also save position data for each person
        const positions = {};
        familyData.forEach(person => {
            const element = document.getElementById(`person-${person.id}`);
            if (element) {
                positions[person.id] = {
                    left: element.style.left,
                    top: element.style.top
                };
            }
        });
        
        localStorage.setItem('familyTreePositions', JSON.stringify(positions));
        
        alert('Your family tree has been saved successfully!');
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        alert('There was an error saving your family tree: ' + error.message);
        return false;
    }
}

// Load data from localStorage
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('familyTreeData');
        const savedPositions = localStorage.getItem('familyTreePositions');
        
        if (!savedData) {
            return false; // No saved data found
        }
        
        // Load family data
        familyData = JSON.parse(savedData);
        
        // Render the tree
        renderFamilyTree();
        
        // Apply saved positions if available
        if (savedPositions) {
            const positions = JSON.parse(savedPositions);
            Object.keys(positions).forEach(personId => {
                const element = document.getElementById(`person-${personId}`);
                if (element) {
                    element.style.left = positions[personId].left;
                    element.style.top = positions[personId].top;
                }
            });
        }
        
        // Update dropdowns if on edit page
        if (isEditPage) {
            updatePersonDropdowns();
        }
        
        return true;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return false;
    }
}

// Export data to a downloadable JSON file
function exportToJSON() {
    try {
        // Create positions object
        const positions = {};
        familyData.forEach(person => {
            const element = document.getElementById(`person-${person.id}`);
            if (element) {
                positions[person.id] = {
                    left: element.style.left,
                    top: element.style.top
                };
            }
        });
        
        // Combine data and positions
        const exportData = {
            familyData: familyData,
            positions: positions
        };
        
        // Create and trigger download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "family_tree.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        return true;
    } catch (error) {
        console.error('Error exporting to JSON:', error);
        alert('Error exporting data: ' + error.message);
        return false;
    }
}

// Import data from a JSON file
function importFromJSON(event) {
    try {
        const file = event.target.files[0];
        if (!file) {
            return false;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Check if data has the expected structure
                if (importedData.familyData && Array.isArray(importedData.familyData)) {
                    // Update family data
                    familyData = importedData.familyData;
                    
                    // Render the tree
                    renderFamilyTree();
                    
                    // Apply positions if available
                    if (importedData.positions) {
                        Object.keys(importedData.positions).forEach(personId => {
                            const element = document.getElementById(`person-${personId}`);
                            if (element) {
                                element.style.left = importedData.positions[personId].left;
                                element.style.top = importedData.positions[personId].top;
                            }
                        });
                    }
                    
                    // Update dropdowns if on edit page
                    if (isEditPage) {
                        updatePersonDropdowns();
                    }
                    
                    // Save to localStorage
                    saveToLocalStorage();
                    
                    alert('Family tree data imported successfully!');
                } else {
                    alert('Invalid file format. The file does not contain valid family tree data.');
                }
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                alert('Error parsing file: ' + parseError.message);
            }
        };
        
        reader.readAsText(file);
        return true;
    } catch (error) {
        console.error('Error importing from JSON:', error);
        alert('Error importing data: ' + error.message);
        return false;
    }
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
