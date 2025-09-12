import React from 'react';

// A generic props interface for all icons
interface IconProps {
  className?: string;
}

export const TrainIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 0a1.125 1.125 0 0 1 1.125 1.125v2.25a1.125 1.125 0 0 1-1.125 1.125h-1.5m-1.5 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h.001M12 15h.008v.008H12V15Zm.008-3.008h.001v.002h-.001V12Zm0-3.002h.002v.002h-.002V9Zm-3.003 3.002h.001v.002h-.001V12Zm0-3.002h.002v.002h-.002V9ZM9 15h.008v.008H9V15Zm-3-3.002h.001v.002H6V12Zm0-3.002h.002v.002H6V9Zm12 6H9m12 0a1.5 1.5 0 0 0-1.5-1.5h-3a1.5 1.5 0 0 0-1.5 1.5m1.5 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0" />
  </svg>
);

export const MagnifyingGlassIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

export const ExclamationTriangleIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

export const InformationCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

export const WrenchScrewdriverIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17 7.373 11.123l3.03-3.03A5.25 5.25 0 0 1 17.25 21M11.42 15.17l2.495-2.495" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const CalendarDaysIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M12 12h.008v.008H12V12Zm0 3h.008v.008H12V15Zm-3-3h.008v.008H9V12Zm0 3h.008v.008H9V15Zm-3-3h.008v.008H6V12Zm0 3h.008v.008H6V15Zm9-3h.008v.008H15V12Zm0 3h.008v.008H15V15Z" />
    </svg>
);

export const TableCellsIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H20.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h.008v.008H3.375v-.008Zm0-3h.008v.008H3.375v-.008Zm0-3h.008v.008H3.375v-.008Zm0-3h.008v.008H3.375v-.008Zm0-3h.008v.008H3.375v-.008Zm0-3h.008v.008H3.375V4.5Zm3.75 15h.008v.008H7.125v-.008Zm0-3h.008v.008H7.125v-.008Zm0-3h.008v.008H7.125v-.008Zm0-3h.008v.008H7.125v-.008Zm0-3h.008v.008H7.125V4.5Zm3.75 15h.008v.008H10.875v-.008Zm0-3h.008v.008H10.875v-.008Zm0-3h.008v.008H10.875v-.008Zm0-3h.008v.008H10.875v-.008Zm0-3h.008v.008H10.875V4.5Zm3.75 15h.008v.008H14.625v-.008Zm0-3h.008v.008H14.625v-.008Zm0-3h.008v.008H14.625v-.008Zm0-3h.008v.008H14.625v-.008Zm0-3h.008v.008H14.625V4.5Zm3.75 15h.008v.008H18.375v-.008Zm0-3h.008v.008H18.375v-.008Zm0-3h.008v.008H18.375v-.008Zm0-3h.008v.008H18.375v-.008Zm0-3h.008v.008H18.375V4.5Z" />
    </svg>
);

export const ClipboardDocumentListIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 6.45 3.75l-.04.04a2.25 2.25 0 0 0-.994 1.583m-3.467 0c-.055.241-.086.495-.086.756v11.25c0 .621.504 1.125 1.125 1.125H9.093c.318 0 .621-.128.85-.354l2.792-2.792a.75.75 0 0 1 1.06 0l2.792 2.792c.229.228.532.354.85.354h2.478c.621 0 1.125-.504 1.125-1.125V8.25a2.25 2.25 0 0 0-2.25-2.25h-2.25" />
    </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);