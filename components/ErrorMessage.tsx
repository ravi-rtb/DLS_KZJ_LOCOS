
import React from 'react';
import { ExclamationTriangleIcon } from './Icons';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md" role="alert">
    <div className="flex">
      <div className="py-1">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-4"/>
      </div>
      <div>
        <p className="font-bold">Error</p>
        <p>{message}</p>
      </div>
    </div>
  </div>
);

export default ErrorMessage;
