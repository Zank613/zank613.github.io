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

// Expand/Collapse project and log details, allowing only one to be open at a time
document.addEventListener('DOMContentLoaded', () => 
{
    const expandableSections = document.querySelectorAll('.project, .log');
    
    expandableSections.forEach(section => 
    {
        const title = section.querySelector('h3');
        const details = section.querySelector('p');
        details.style.display = 'none'; // Initially hide details

        title.addEventListener('click', () => 
        {
            // Collapse any currently open sections
            expandableSections.forEach(sec => 
            {
                if (sec !== section) 
                {
                    sec.querySelector('p').style.display = 'none';
                }
            });

            // Toggle the clicked section
            if (details.style.display === 'none') 
            {
                details.style.display = 'block';
            } 
            else 
            {
                details.style.display = 'none';
            }
        });
    });
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
