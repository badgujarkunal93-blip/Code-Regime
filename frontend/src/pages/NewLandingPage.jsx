import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NewLandingPage = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Fetch the pre-linked body HTML from public directory
    fetch('/landing_body.html')
      .then((res) => res.text())
      .then((text) => setHtmlContent(text))
      .catch((err) => console.error('Failed to load landing page:', err));

    // 2. Inject landing-specific stylesheets into document head
    const link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href = '/_next/static/css/510de3950fa348a7.css';
    link1.id = 'landing-css-1';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = '/_next/static/css/e1968d57203b1475.css';
    link2.id = 'landing-css-2';
    document.head.appendChild(link2);

    // 3. Set page classes matching the NextJS export structure
    const htmlEl = document.documentElement;
    const originalHtmlClass = htmlEl.className;
    htmlEl.className = '__variable_246ccd __variable_4c40f6 antialiased';

    const bodyEl = document.body;
    const originalBodyClass = bodyEl.className;
    bodyEl.className = 'relative flex min-h-svh flex-col overflow-x-hidden';

    // Cleanup on unmount (removes styling when navigating inside the app)
    return () => {
      document.getElementById('landing-css-1')?.remove();
      document.getElementById('landing-css-2')?.remove();
      htmlEl.className = originalHtmlClass;
      bodyEl.className = originalBodyClass;
    };
  }, []);

  // Intercept click events to perform single-page routing without page reload
  const handleContainerClick = (e) => {
    const anchor = e.target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      // Only intercept local relative links starting with "/"
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        navigate(href);
      }
    }
  };

  return (
    <div 
      className="w-full min-h-screen bg-background"
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default NewLandingPage;
