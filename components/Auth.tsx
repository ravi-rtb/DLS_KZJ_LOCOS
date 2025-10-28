
import React, { useEffect, useState, useRef } from 'react';
import type { UserProfile } from '../types';
import { GOOGLE_CLIENT_ID } from '../constants';
import { SignOutIcon } from './Icons';

// This is a browser-only global variable from the Google GSI script
declare const google: any;

interface AuthProps {
  onAuthChange: (user: UserProfile | null, token: string | null) => void;
}

// A simple JWT decoder
const jwt_decode = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const Auth: React.FC<AuthProps> = ({ onAuthChange }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const signInButtonRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    setUser(null);
    onAuthChange(null, null);
    // You can also add google.accounts.id.disableAutoSelect() here if you want to
    // force the user to re-select an account next time.
  };

  const handleCredentialResponse = (response: any) => {
    const idToken = response.credential;
    const userObject: any = jwt_decode(idToken);
    
    if (userObject) {
      const profile: UserProfile = {
        name: userObject.name,
        email: userObject.email,
        picture: userObject.picture,
      };
      setUser(profile);
      onAuthChange(profile, idToken);
    }
  };

  useEffect(() => {
    const initializeGsi = () => {
      if (typeof google === 'undefined' || !signInButtonRef.current) {
        // If the script hasn't loaded yet, try again shortly.
        setTimeout(initializeGsi, 100);
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      google.accounts.id.renderButton(
        signInButtonRef.current,
        { theme: 'outline', size: 'large', type: 'standard' }
      );
    };
    
    initializeGsi();
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.picture}
          alt={user.name}
          className="h-10 w-10 rounded-full border-2 border-white"
        />
        <div className="text-white hidden sm:block">
          <p className="font-semibold text-sm">{user.name}</p>
          <p className="text-xs">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-full text-white hover:bg-brand-secondary transition-colors"
          title="Sign Out"
        >
          <SignOutIcon className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return <div ref={signInButtonRef}></div>;
};

export default Auth;
