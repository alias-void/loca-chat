import React from "react";
import { useState, useEffect } from "react";

import "./Profile.css";
import { getfb, getUserId } from "../App";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface ProfileProps {
  isVisible: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: any;
}

const decodeImage = (data: any): string | null => {
  return data?.imageUrl ? `url("${data.imageUrl}")` : null;
};

const Profile: React.FC<ProfileProps> = ({
  isVisible,
  onClose,
  onLogout,
  user,
}) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user) return;
      const userId = getUserId();
      if (!userId) return;

      const docRef = doc(getfb(), userId, "profileImage");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const decodedImage = decodeImage(docSnap.data());
        setProfileImage(decodedImage);
      }
    };

    if (isVisible) {
      fetchProfileImage();
    }
  }, [isVisible, user]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files.length > 0) {
      const colRef = doc(getfb(), `${getUserId()}`, "profileImage");

      const reader = new FileReader();

      reader.readAsDataURL(event.target.files[0]);

      reader.onload = async () => {
        if (typeof reader.result === "string") {
          await setDoc(colRef, { imageUrl: reader.result });
          setProfileImage(`url("${reader.result}")`);
        }
      };
      console.log("Document written with ID: ");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="profile-container">
      <div className="profile-modal-card">
        <button className="brutalist-card__close-btn" onClick={onClose}>
          &times;
        </button>
        <div className="profile-content-row">
          <div className="stack profile-image-container">
            <div className="card image-card">
              <label htmlFor="imageUpload">
                <div
                  className="image"
                  style={{ backgroundImage: profileImage || undefined }}
                >
                  <div className="edit-image-icon-container">
                    <svg
                      className="edit-image-icon w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
                      />
                    </svg>
                  </div>
                </div>
                <input
                  type="file"
                  id="imageUpload"
                  name="imageUpload"
                  accept="image/png, image/jpeg, image/gif"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
          <div className="brutalist-card">
            <div style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
              <div>
                <div className="profile-info">
                  <h2></h2>
                  <p></p>
                </div>
                <div className="brutalist-card__actions"></div>
              </div>
              <div className="brutalist-card">
                <div className="brutalist-card__header">
                  <div className="brutalist-card__alert">Account</div>
                </div>
                <div className="brutalist-card__message">
                  {user?.displayName}
                </div>
                <div className="brutalist-card__message">{user?.email}</div>
                <div className="brutalist-card__actions">
                  {/* <a
                    className="brutalist-card__button brutalist-card__button--mark"
                    href="#"
                  >
                    Mark as Read
                  </a> */}
                  <a
                    className="brutalist-card__button brutalist-card__button--read"
                    onClick={onLogout}
                  >
                    Logout
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
