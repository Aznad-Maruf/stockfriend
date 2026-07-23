import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import './ScraperStatus.css';

export default function ScraperStatus() {
  const { language } = useApp();
  const { scraperStatus, dataSource } = useData();

  let statusClass = 'scraper-status--static';
  let message = language === 'bn' ? 'স্ট্যাটিক ডেটা ব্যবহার করা হচ্ছে' : 'Using static data';
  let dotColor = 'var(--color-text-quaternary)';

  if (dataSource === 'csv' && scraperStatus) {
    const lastUpdate = new Date(scraperStatus.last_successful_run);
    const now = new Date();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

    if (scraperStatus.status === 'success') {
      if (diffHours <= 24) {
        statusClass = 'scraper-status--success';
        message = language === 'bn' 
          ? `ডেটা আপডেট হয়েছে ${Math.round(diffHours)} ঘণ্টা আগে`
          : `Data updated ${Math.round(diffHours)} hours ago`;
      } else {
        statusClass = 'scraper-status--warning';
        message = language === 'bn'
          ? `ডেটা পুরনো হতে পারে (শেষ আপডেট ${Math.round(diffHours / 24)} দিন আগে)`
          : `Data may be outdated (last updated ${Math.round(diffHours / 24)} days ago)`;
      }
    } else {
      statusClass = 'scraper-status--error';
      message = language === 'bn'
        ? `ডেটা আপডেট ব্যর্থ হয়েছে: ${scraperStatus.error || 'অজানা ত্রুটি'}`
        : `Data update failed: ${scraperStatus.error || 'Unknown error'}`;
    }
  }

  return (
    <div className={`scraper-status ${statusClass}`}>
      <span className="scraper-status__dot"></span>
      <span className="scraper-status__text">{message}</span>
    </div>
  );
}
