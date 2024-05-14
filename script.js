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
});

// Expand/Collapse project and log details
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

console.log('Welcome to My Devlogs and Portfolio');
