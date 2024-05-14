// Highlight the current page link in the navigation bar
document.addEventListener('DOMContentLoaded', () => 
{
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => 
    {
        if (link.href === window.location.href) 
        {
            link.classList.add('active');
        }
    });

    // Set initial theme based on localStorage
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.add(`${currentTheme}-mode`);
    document.getElementById('theme-select').value = currentTheme;
});

// Theme toggle functionality
document.getElementById('theme-select').addEventListener('change', (event) => 
{
    const selectedTheme = event.target.value;
    document.body.classList.toggle('dark-mode', selectedTheme === 'dark');
    document.body.classList.toggle('light-mode', selectedTheme === 'light');
    localStorage.setItem('theme', selectedTheme);
});

console.log('Welcome to My Devlogs and Portfolio');
