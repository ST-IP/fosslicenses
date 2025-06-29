const getLocalizedText = (arr, lang = 'ja') => {
    if (!arr || arr.length === 0) return ''; // Return empty string if no text found
    const item = arr.find(item => item.language === lang) || arr.find(item => item.language === 'en') || arr[0];
    return item ? item.text : ''; // Return empty string if item or text is not found
};

// Recursive function to render condition tree
function renderConditionTree(node, conditionsMap, indent = 0) {
    let html = '';
    if (node.type === 'LEAF') {
        const condition = conditionsMap.get(node.ref);
        if (condition) {
            const name = getLocalizedText(condition.name || []);
            const description = getLocalizedText(condition.description || []);
            if (name || description) { // Only render if name or description exists
                html += `<div class="condition-leaf" style="margin-left: ${indent * 20}px;">`;
                html += `<strong>LEAF (${condition.conditionType}):</strong> ${name}${description ? ': ' + description : ''}`;
                html += `</div>`;
            }
        }
    } else if (node.type === 'AND' || node.type === 'OR') {
        let childrenHtml = '';
        node.children.forEach(child => {
            const childRender = renderConditionTree(child, conditionsMap, indent + 1);
            if (childRender) {
                childrenHtml += childRender;
            }
        });
        if (childrenHtml) {
            html += `<div class="condition-node" style="margin-left: ${indent * 20}px;">`;
            html += `<strong>${node.type}:</strong>`;
            html += childrenHtml;
            html += `</div>`;
        }
    }
    return html;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded. Attempting to fetch data...');
    try {
        const [licensesResponse, actionsResponse, conditionsResponse, noticesResponse] = await Promise.all([
            fetch('data/licenses.json'),
            fetch('data/actions.json'),
            fetch('data/conditions.json'),
            fetch('data/notices.json')
        ]);

        // Check if responses are OK
        if (!licensesResponse.ok) throw new Error(`HTTP error! status: ${licensesResponse.status} for licenses.json`);
        if (!actionsResponse.ok) throw new Error(`HTTP error! status: ${actionsResponse.status} for actions.json`);
        if (!conditionsResponse.ok) throw new Error(`HTTP error! status: ${conditionsResponse.status} for conditions.json`);
        if (!noticesResponse.ok) throw new Error(`HTTP error! status: ${noticesResponse.status} for notices.json`);

        const licensesData = await licensesResponse.json();
        const actionsData = await actionsResponse.json();
        const conditionsData = await conditionsResponse.json();
        const noticesData = await noticesResponse.json();

        console.log('All data fetched successfully.');

        // Create maps for quick lookup by ID
        const actionsMap = new Map(actionsData.map(item => [item.data.id, item.data]));
        const conditionsMap = new Map(conditionsData.map(item => [item.data.id, item.data]));
        const noticesMap = new Map(noticesData.map(item => [item.data.id, item.data]));

        const licensesContainer = document.getElementById('licenses-container');

        licensesData.forEach(licenseItem => {
            const license = licenseItem.data; // Access the 'data' object within each item
            const licenseCard = document.createElement('div');
            licenseCard.classList.add('license-card');

            const name = license.name || '';
            const spdx = license.spdx || '';
            const summary = getLocalizedText(license.summary || []);
            const description = getLocalizedText(license.description || []);
            const content = license.content || '';

            let cardHtml = '';
            cardHtml += `<h2 class="license-title">${name}</h2>`; // Add class for click event

            cardHtml += `<div class="license-details">`; // Details section to be toggled
            if (spdx) cardHtml += `<p><strong>SPDX:</strong> ${spdx}</p>`;
            if (summary) cardHtml += `<p><strong>Summary:</strong> ${summary}</p>`;
            if (description) cardHtml += `<p><strong>Description:</strong> ${description}</p>`;

            let permissionsHtml = '';
            if (license.permissions && license.permissions.length > 0) {
                let currentPermissionHtml = '';
                license.permissions.forEach(permission => {
                    const permSummary = getLocalizedText(permission.summary || []);
                    const permDescription = getLocalizedText(permission.description || []);

                    let actionsListHtml = '';
                    if (permission.actions && permission.actions.length > 0) {
                        let currentActionsItemsHtml = '';
                        permission.actions.forEach(actionRef => {
                            const action = actionsMap.get(actionRef.ref);
                            if (action) {
                                const actionName = getLocalizedText(action.name || []);
                                const actionDescription = getLocalizedText(action.description || []);
                                if (actionName || actionDescription) {
                                    currentActionsItemsHtml += `<div class="action-item"><strong>${actionName}${actionDescription ? ': ' + actionDescription : ''}</strong></div>`;
                                }
                            }
                        });
                        if (currentActionsItemsHtml) {
                            actionsListHtml += `<h4>Actions:</h4>${currentActionsItemsHtml}`;
                        }
                    }

                    let conditionsTreeHtml = '';
                    if (permission.conditionHead) {
                        const renderedConditions = renderConditionTree(permission.conditionHead, conditionsMap);
                        if (renderedConditions) {
                            conditionsTreeHtml += `<h4>Conditions:</h4>${renderedConditions}`;
                        }
                    }

                    if (permSummary || permDescription || actionsListHtml || conditionsTreeHtml) {
                        currentPermissionHtml += `<div class="permission-section">`;
                        if (permSummary) currentPermissionHtml += `<p><strong>Summary:</strong> ${permSummary}</p>`;
                        if (permDescription) currentPermissionHtml += `<p><strong>Description:</strong> ${permDescription}</p>`;
                        currentPermissionHtml += actionsListHtml;
                        currentPermissionHtml += conditionsTreeHtml;
                        currentPermissionHtml += `</div>`;
                    }
                });
                if (currentPermissionHtml) {
                    permissionsHtml += `<h3>Permissions:</h3>${currentPermissionHtml}`;
                }
            }

            let noticesHtml = '';
            if (license.notices && license.notices.length > 0) {
                let currentNoticesItemsHtml = '';
                license.notices.forEach(noticeRef => {
                    const notice = noticesMap.get(noticeRef.ref);
                    if (notice) {
                        const noticeDescription = getLocalizedText(notice.description || []);
                        const noticeContent = getLocalizedText(notice.content || []);
                        if (noticeDescription || noticeContent) {
                            currentNoticesItemsHtml += `<div class="notice-item"><strong>${noticeDescription}${noticeContent ? ': ' + noticeContent : ''}</strong></div>`;
                        }
                    }
                });
                if (currentNoticesItemsHtml) {
                    noticesHtml += `<h3>Notices:</h3>${currentNoticesItemsHtml}`;
                }
            }

            cardHtml += permissionsHtml;
            cardHtml += noticesHtml;
            if (content) {
                cardHtml += `<h3>Content:</h3><pre class="license-content">${content}</pre>`;
            }
            cardHtml += `</div>`; // Close license-details

            licenseCard.innerHTML = cardHtml;
            licensesContainer.appendChild(licenseCard);

            // Add click event listener for toggling details
            licenseCard.querySelector('.license-title').addEventListener('click', function() {
                this.nextElementSibling.classList.toggle('expanded');
            });
        });

    } catch (error) {
        console.error('Error fetching or processing data:', error);
        document.getElementById('licenses-container').innerHTML = '<p>Failed to load licenses. Check console for details.</p>';
    }
});