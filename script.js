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

console.log('Welcome to My Devlogs and Portfolio');
