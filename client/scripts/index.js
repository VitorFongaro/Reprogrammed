const modal = document.getElementById('modal');
const teamContent = document.getElementById('team-content');
const contactContent = document.getElementById('contact-content');

const teamButton = document.getElementById('team-button');
const contactButton = document.getElementById('contact-button');
const closeModal = document.getElementById('close-modal');

teamButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    teamContent.style.display = 'block';
});

contactButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    contactContent.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    teamContent.style.display = 'none';
    contactContent.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        teamContent.style.display = 'none';
        contactContent.style.display = 'none';
    }
});