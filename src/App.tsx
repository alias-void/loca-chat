import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { useState, useRef, useEffect } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getDatabase, get, set, ref } from "firebase/database";
import { collection, addDoc, getFirestore } from "firebase/firestore";

import MapComponent from "./Map.tsx";
import "./App.css";
import Loader from "./components/Loader.tsx";
import Profile from "./components/Profile.tsx";

let USER: any = null;
let fireStore: any = null;
let database: any = null;

function getdb() {
  return database;
}

function getfb() {
  return fireStore;
}

function getUserId() {
  return USER.uid;
}

function onChatCloseBtnClick() {
  let chatInterface = document.querySelector(".user-chat-interface");

  if (chatInterface) {
    chatInterface.classList.remove("chat-interface-show");
    chatInterface.classList.add("chat-interface-hide");
  }
}

function App() {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  database = getDatabase(app);
  fireStore = getFirestore(app);
  const [showLoader, setShowLoader] = useState(false); // State to control Loader visibility

  const textRef = useRef<HTMLTextAreaElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [isAuthFormVisible, setAuthFormVisible] = useState(false); // Renamed for clarity
  const [isSignUp, setIsSignUp] = useState(true); // To toggle between Sign Up and Sign In

  const auth = getAuth(app);

  const [isProfileVisible, setProfileVisible] = useState(false);

  const onProfileBtnClick = () => {
    setProfileVisible(true);
  };

  const onProfileClose = () => {
    setProfileVisible(false);
  };

  const onLogout = () => {
    signOut(auth).then(() => {
      localStorage.removeItem("email");
      localStorage.removeItem("password");
      setProfileVisible(false);
      setAuthFormVisible(true);
      USER = null;
    });
  };
  const signUpBtnClick = () => {
    setShowLoader(true);

    let name = nameRef.current?.value ?? "";
    let email = emailRef.current?.value ?? "";
    let password = passwordRef.current?.value ?? "";
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Signed up
        USER = userCredential.user;

        await updateProfile(USER, {
          displayName: name,
        });
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);
        setAuthFormVisible(false);
        setShowLoader(false);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        console.log(errorMessage);
        setShowLoader(false);
      });
  };

  const signInBtnClick = () => {
    setShowLoader(true);
    let email = emailRef.current?.value ?? "";
    let password = passwordRef.current?.value ?? "";

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        USER = userCredential.user;
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);
        setAuthFormVisible(false);
        setShowLoader(false);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Sign in failed:", errorMessage);
        // You might want to show this error to the user
        setShowLoader(false);
      });
  };

  useEffect(() => {
    // This effect handles auto-login
    const email = localStorage.getItem("email");
    const password = localStorage.getItem("password");

    if (email && password) {
      setShowLoader(true);
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          USER = userCredential.user;
          setAuthFormVisible(false);
        })
        .catch((error) => {
          console.error("Auto sign-in failed:", error.message);
          // If auto sign-in fails, show the form
          setAuthFormVisible(true);
        })
        .finally(() => {
          setShowLoader(false);
        });
    } else {
      setAuthFormVisible(true);
    }
  }, [auth]); // The effect depends on `auth` and should run once on mount.

  const sendBtnClick = () => {
    let text = textRef.current?.value ?? "";
    if (text == "") return;

    get(ref(database, `groups/${localStorage.getItem("currentChat")}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          let texts = snapshot.val().texts;
          texts
            ? texts.push({ text: text, userId: getUserId() })
            : (texts = [{ text: text, userId: getUserId() }]);
          set(ref(database, `groups/${localStorage.getItem("currentChat")}`), {
            name: snapshot.val().name,
            lat: snapshot.val().lat,
            lng: snapshot.val().lng,
            texts: texts,
          });
          textRef.current && (textRef.current.value = "");
        } else {
          console.log("No data available");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendBtnClick();
    }
  };

  return (
    <div>
      <Profile
        isVisible={isProfileVisible}
        onClose={onProfileClose}
        onLogout={onLogout}
        user={USER}
      ></Profile>
      <Loader isVisible={showLoader}></Loader>
      <div
        className="authentication-page"
        style={{ display: isAuthFormVisible ? "flex" : "none" }}
      >
        <form action="" className="form" onSubmit={(e) => e.preventDefault()}>
          <p>
            Welcome,
            <span>
              {isSignUp ? "sign up to continue" : "sign in to continue"}
            </span>
          </p>
          <button className="oauthButton">
            <svg className="icon" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              ></path>
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              ></path>
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              ></path>
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              ></path>
              <path d="M1 1h22v22H1z" fill="none"></path>
            </svg>
            Continue with Google
          </button>
          <div className="separator">
            <div></div>
            <span>OR</span>
            <div></div>
          </div>
          {isSignUp && (
            <input type="text" ref={nameRef} placeholder="Name" name="name" />
          )}
          <input type="email" ref={emailRef} placeholder="Email" name="email" />
          <input
            type="password"
            ref={passwordRef}
            placeholder="Password"
            name="password"
          />
          <button
            className="oauthButton"
            onClick={isSignUp ? signUpBtnClick : signInBtnClick}
          >
            Continue
            <svg
              className="icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 17 5-5-5-5"></path>
              <path d="m13 17 5-5-5-5"></path>
            </svg>
          </button>
          <span className="signin-link">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <a href="#" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? " Sign in" : " Sign up"}
            </a>
          </span>
        </form>
      </div>
      <div className="user-profile-button" onClick={onProfileBtnClick}>
        <svg
          className="w-6 h-6 text-gray-800 dark:text-white"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M7 17v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3Zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </div>
      <div className="user-chat-interface">
        <div id="chat-header-container">
          <h1 id="chat-title">This is a title</h1>
          <img
            className="cross-icon"
            src="/src/assets/cross-icon.svg"
            onClick={onChatCloseBtnClick}
          ></img>
        </div>
        <div id="text-list-container"></div>
        <div id="chat-text-box-container">
          <textarea
            id="chat-text-box"
            ref={textRef}
            onKeyDown={handleKeyPress}
          ></textarea>
          <img
            className="send-icon"
            src="/src/assets/send-icon.svg"
            onClick={sendBtnClick}
          ></img>
        </div>
      </div>
      <MapComponent></MapComponent>
    </div>
  );
}

export default App;
export { getdb, getUserId, getfb };
