// Function to extend admin panel with timestamp controls for archiving
function extendAdminPanelForArchiving() {
  // Wait for the admin panel to be loaded
  const checkInterval = setInterval(() => {
    const addPaperForm = document.getElementById('addPaperForm');
    if (addPaperForm) {
      clearInterval(checkInterval);
      
      // Add timestamp field before the submit button
      const submitButton = document.getElementById('submitPaper');
      if (submitButton) {
        const timestampGroup = document.createElement('div');
        timestampGroup.className = 'form-group';
        timestampGroup.innerHTML = `
          <label for="paperTimestamp">Archive Date</label>
          <input type="date" id="paperTimestamp" class="form-control">
          <p class="form-hint">Papers are archived on the 28th of each month by default.</p>
        `;
        
        addPaperForm.insertBefore(timestampGroup, submitButton.parentNode);
        
        // Modify submit handler to include timestamp
        const originalOnClick = submitButton.onclick;
        submitButton.onclick = function(e) {
          // Get form values
          const title = document.getElementById('paperTitle').value.trim();
          const authors = document.getElementById('paperAuthors').value.trim();
          const link = document.getElementById('paperLink').value.trim();
          const journal = document.getElementById('paperJournal').value;
          const abstract = document.getElementById('paperAbstract').value.trim();
          const timestamp = document.getElementById('paperTimestamp').value;
          const imageUrl = document.getElementById('imagePreview').style.display === 'block' 
            ? document.getElementById('imagePreview').src 
            : '/api/placeholder/200/200';
          
          // Validation
          if (!title || !authors || !abstract) {
            alert('Please fill out all required fields: Title, Authors, and Abstract');
            return false;
          }
          
          // Process timestamp
          let paperData = {
            title,
            authors,
            journal,
            abstract,
            link: link || '#',
            imageUrl
          };
          
          if (timestamp) {
            const date = new Date(timestamp);
            date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
            paperData.timestamp = date.toISOString();
            paperData.year = date.getFullYear();
            paperData.month = date.getMonth() + 1;
          } else {
            // Set to the 28th of current month by default
            const now = new Date();
            const archiveDate = new Date(now.getFullYear(), now.getMonth(), 28, 12, 0, 0, 0);
            paperData.timestamp = archiveDate.toISOString();
            paperData.year = archiveDate.getFullYear();
            paperData.month = archiveDate.getMonth() + 1;
          }
          
          // Show loading
          document.getElementById('addLoading').style.display = 'block';
          
          // Get data manager
          const dataManager = window.dataManager;
          
          // Check if we're editing or adding
          const editingPaperId = window.editingPaperId;
          if (editingPaperId) {
            // Update existing paper
            dataManager.updatePaper(editingPaperId, paperData);
            
            // Update DOM if paper is visible
            const paperElement = document.querySelector(`.paper-card[data-paper-id="${editingPaperId}"]`);
            if (paperElement) {
              updatePaperInDOM(editingPaperId, paperData);
            }
            
            // Reset editing mode
            window.editingPaperId = null;
            submitButton.textContent = 'Add Paper';
          } else {
            // Add new paper
            const newPaper = dataManager.addPaper(paperData);
            
            // Add to DOM if journal section is currently visible
            const journalSection = document.getElementById(newPaper.journal);
            if (journalSection) {
              addPaperToDOM(newPaper);
            }
          }
          
          // Reset form
          document.getElementById('paperTitle').value = '';
          document.getElementById('paperAuthors').value = '';
          document.getElementById('paperLink').value = '';
          document.getElementById('paperAbstract').value = '';
          document.getElementById('paperImage').value = '';
          document.getElementById('paperTimestamp').value = '';
          document.getElementById('imagePreview').style.display = 'none';
          
          // Hide loading
          document.getElementById('addLoading').style.display = 'none';
          
          // Refresh archive view if needed
          if (document.getElementById('archive').offsetParent !== null) {
            createArchiveTab();
          }
          
          // Show success message
          alert(editingPaperId ? 'Paper updated successfully!' : 'Paper added successfully!');
          
          // Prevent default behavior
          return false;
        };
      }
      
      // Add an "Archive Management" tab to the admin panel
      const adminTabs = document.querySelector('.admin-tabs');
      if (adminTabs && !document.getElementById('archiveManagementTab')) {
        const archiveTab = document.createElement('div');
        archiveTab.id = 'archiveManagementTab';
        archiveTab.className = 'admin-tab';
        archiveTab.textContent = 'Archive Management';
        
        adminTabs.appendChild(archiveTab);
        
        // Create the Archive Management content
        const adminContent = document.getElementById('adminContent');
        if (adminContent) {
          const archiveManagementForm = document.createElement('div');
          archiveManagementForm.id = 'archiveManagementForm';
          archiveManagementForm.style.display = 'none';
          
          archiveManagementForm.innerHTML = `
            <div class="form-group">
              <h3>Archive Management</h3>
              <p>Papers are automatically added to the archive on the 28th day of each month. Use the calendar below to set custom archive dates.</p>
            </div>
            
            <div class="form-group">
              <label for="bulkArchiveDate">Bulk Archive Date</label>
              <input type="date" id="bulkArchiveDate" class="form-control">
            </div>
            
            <div class="form-group">
              <label>Select Papers to Archive</label>
              <div id="archivePaperList" class="paper-list">
                <!-- Papers will be listed here dynamically -->
              </div>
            </div>
            
            <button id="bulkArchiveButton" class="btn-primary">Update Archive Dates</button>
            
            <div id="archiveManagementLoading" class="loading">
              <div class="spinner"></div>
              <p>Processing...</p>
            </div>
          `;
          
          adminContent.appendChild(archiveManagementForm);
          
          // Add tab click event
          archiveTab.addEventListener('click', function() {
            // Update tab states
            document.querySelectorAll('.admin-tab').forEach(tab => {
              tab.classList.remove('active');
            });
            archiveTab.classList.add('active');
            
            // Hide other forms
            document.getElementById('addPaperForm').style.display = 'none';
            document.getElementById('managePapersForm').style.display = 'none';
            document.getElementById('importExportForm').style.display = 'none';
            
            // Show archive management form
            archiveManagementForm.style.display = 'block';
            
            // Load papers for archiving
            loadPapersForArchiving();
          });
          
          // Add functionality to the bulk archive button
          const bulkArchiveButton = document.getElementById('bulkArchiveButton');
          if (bulkArchiveButton) {
            bulkArchiveButton.addEventListener('click', function() {
              const archiveDate = document.getElementById('bulkArchiveDate').value;
              
              if (!archiveDate) {
                alert('Please select an archive date');
                return;
              }
              
              // Get checked papers
              const checkedPapers = document.querySelectorAll('.archive-paper-checkbox:checked');
              if (checkedPapers.length === 0) {
                alert('Please select at least one paper to archive');
                return;
              }
              
              // Show loading indicator
              document.getElementById('archiveManagementLoading').style.display = 'block';
              
              // Process the date to create a timestamp
              const date = new Date(archiveDate);
              date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
              const timestamp = date.toISOString();
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              
              // Update paper timestamps
              const dataManager = window.dataManager;
              
              checkedPapers.forEach(checkbox => {
                const paperId = checkbox.getAttribute('data-paper-id');
                
                dataManager.updatePaper(paperId, {
                  timestamp,
                  year,
                  month
                });
              });
              
              // Hide loading indicator
              document.getElementById('archiveManagementLoading').style.display = 'none';
              
              // Refresh the archive papers list
              loadPapersForArchiving();
              
              // Refresh archive view if it's currently visible
              if (document.getElementById('archive').offsetParent !== null) {
                createArchiveTab();
              }
              
              alert(`Successfully updated archive dates for ${checkedPapers.length} papers.`);
            });
          }
        }
      }
      
      // Add additional CSS for the archive management form
      const style = document.createElement('style');
      style.textContent = `
        .paper-checkbox {
          margin-right: 15px;
          display: flex;
          align-items: center;
        }
        
        .archive-paper-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        
        .paper-item {
          display: flex;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 10px;
          background-color: #fff;
        }
        
        .select-all-container {
          background-color: #f5f7fa;
          border: 1px dashed #aaa;
        }
        
        #archivePaperList {
          max-height: 400px;
          overflow-y: auto;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
        }
      `;
      
      document.head.appendChild(style);
      
      // Function to load papers for archiving
      function loadPapersForArchiving() {
        const archivePaperList = document.getElementById('archivePaperList');
        if (!archivePaperList) return;
        
        // Show loading
        document.getElementById('archiveManagementLoading').style.display = 'block';
        
        // Clear existing list
        archivePaperList.innerHTML = '';
        
        // Get data manager
        const dataManager = window.dataManager;
        if (!dataManager) return;
        
        // Get all papers
        const papers = dataManager.papers;
        
        // Journal names mapping
        const journalNames = {
          'science': 'Science',
          'nature': 'Nature',
          'cell': 'Cell',
          'jacs': 'JACS',
          'jmc': 'J Med Chem'
        };
        
        // Create a list item for each paper
        papers.forEach(paper => {
          const paperItem = document.createElement('div');
          paperItem.className = 'paper-item';
          
          // Format date for display
          const paperDate = new Date(paper.timestamp);
          const formattedDate = `${paperDate.getFullYear()}-${String(paperDate.getMonth() + 1).padStart(2, '0')}-${String(paperDate.getDate()).padStart(2, '0')}`;
          
          paperItem.innerHTML = `
            <div class="paper-checkbox">
              <input type="checkbox" class="archive-paper-checkbox" data-paper-id="${paper.id}" id="archive-checkbox-${paper.id}">
            </div>
            <div class="paper-info">
              <h3 class="paper-title-list">${paper.title}</h3>
              <p>${paper.authors}</p>
              <p class="paper-journal">${journalNames[paper.journal] || paper.journal} - Current archive date: ${formattedDate}</p>
            </div>
          `;
          
          archivePaperList.appendChild(paperItem);
        });
        
        // Add a "select all" checkbox
        if (papers.length > 0) {
          const selectAllContainer = document.createElement('div');
          selectAllContainer.className = 'paper-item select-all-container';
          selectAllContainer.innerHTML = `
            <div class="paper-checkbox">
              <input type="checkbox" id="select-all-papers">
            </div>
            <div class="paper-info">
              <label for="select-all-papers" style="font-weight: bold; cursor: pointer;">Select All Papers</label>
            </div>
          `;
          
          archivePaperList.insertBefore(selectAllContainer, archivePaperList.firstChild);
          
          // Add event listener for the select all checkbox
          document.getElementById('select-all-papers').addEventListener('change', function() {
            const isChecked = this.checked;
            document.querySelectorAll('.archive-paper-checkbox').forEach(checkbox => {
              checkbox.checked = isChecked;
            });
          });
        }
        
        // Hide loading
        document.getElementById('archiveManagementLoading').style.display = 'none';
      }
      
      // Expose the loadPapersForArchiving function globally
      window.loadPapersForArchiving = loadPapersForArchiving;
    }
  }, 1000); // Check every second for the admin panel to be loaded
}

// Add paper to DOM function (used by admin panel)
function addPaperToDOM(paper) {
  // Get the journal section
  const journalSection = document.getElementById(paper.journal);
  if (!journalSection) return;
  
  // Create paper card
  const paperCard = document.createElement('div');
  paperCard.className = 'paper-card';
  paperCard.dataset.paperId = paper.id;
  
  // Set HTML content
  paperCard.innerHTML = `
    <h3 class="paper-title">${paper.title}</h3>
    <p class="paper-authors">${paper.authors}</p>
    <div class="paper-content">
      <div class="paper-image">
        <img src="${paper.imageUrl}" alt="${paper.title} Abstract Image" />
      </div>
      <div class="paper-abstract">
        <p>${paper.abstract}</p>
        <div class="paper-actions">
          <a href="${paper.link}" class="paper-button">View Paper</a>
          <button class="paper-button citation-button" data-paper-id="${paper.id}">Cite</button>
          <button class="paper-button save-button" data-paper-id="${paper.id}">Save</button>
        </div>
      </div>
    </div>
  `;
  
  // Append to journal section
  journalSection.appendChild(paperCard);
  
  // Add event listeners for citation and save buttons
  const citationButton = paperCard.querySelector('.citation-button');
  if (citationButton) {
    citationButton.addEventListener('click', handleCitationClick);
  }
  
  const saveButton = paperCard.querySelector('.save-button');
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveClick);
  }
}

// Update paper in DOM function (used by admin panel)
function updatePaperInDOM(paperId, paperData) {
  const paperCard = document.querySelector(`.paper-card[data-paper-id="${paperId}"]`);
  if (!paperCard) return;
  
  // Update elements
  paperCard.querySelector('.paper-title').textContent = paperData.title;
  paperCard.querySelector('.paper-authors').textContent = paperData.authors;
  paperCard.querySelector('.paper-abstract p').textContent = paperData.abstract;
  paperCard.querySelector('.paper-image img').src = paperData.imageUrl;
  
  const viewButton = paperCard.querySelector('a.paper-button');
  if (viewButton) {
    viewButton.href = paperData.link;
  }
}

// Make these functions available globally
window.addPaperToDOM = addPaperToDOM;
window.updatePaperInDOM = updatePaperInDOM;