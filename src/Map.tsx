import { useRef, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import L from "leaflet";
import { getdb, getfb, getUserId } from "./App.tsx";
import { get, ref, onValue } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";

import chatIconUrl from "/src/assets/chat-icon.svg";
import defaultProfileUrl from "/src/assets/default-profile.png";

// Extend Leaflet's Marker to include our custom data
declare module "leaflet" {
  interface Marker {
    chatData?: { id: string; chatName: string; location: [number, number] };
  }
}

const decodeImage = (data: any): string | null => {
  return data?.imageUrl || null;
};

const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const center = { lng: 13.338414, lat: 52.507932 };
  const [zoom] = useState(3);

  // A module-level cache to store fetched profile images across renders
  const imageCache = new Map<string, string | null>();

  const fetchProfileImage = async (userId: string) => {
    if (imageCache.has(userId)) {
      return imageCache.get(userId);
    }
    const docRef = doc(getfb(), userId, "profileImage");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const decodedImage = decodeImage(docSnap.data());
      imageCache.set(userId, decodedImage);
      return decodedImage;
    }
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    let bounds = L.latLngBounds([85, 190], [-85, -170]);

    map.current = new L.Map(mapContainer.current!, {
      center: L.latLng(center.lat, center.lng),
      attributionControl: false,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 18,
      maxBounds: bounds,
      zoomControl: false,
    });

    // Add a light-themed OpenStreetMap tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map.current!);

    map.current!.locate({ setView: true });

    function onLocationFound(e: any) {
      map.current!.setView(e.latlng, 16);
    }

    map.current!.on("locationfound", onLocationFound);

    var chatIcon = L.icon({
      iconUrl: chatIconUrl,

      iconSize: [38, 95],
      shadowSize: [50, 64],
      iconAnchor: [22, 94],
      shadowAnchor: [4, 62],
      popupAnchor: [-3, -76],
    });

    get(ref(getdb(), "groups"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          let groups = snapshot.val();
          Object.entries(groups).map(([groupId, group]: [string, any]) => {
            let marker = L.marker([group.lat, group.lng], {
              icon: chatIcon,
            }).addTo(map.current!);

            marker.chatData = {
              id: groupId,
              chatName: group.name,
              location: [group.lat, group.lng],
            };

            marker.on("click", (e: any) => {
              let chatTitle = document.querySelector("#chat-title");
              let chatInterface = document.querySelector(
                ".user-chat-interface"
              );
              let listContainer = document.querySelector(
                "#text-list-container"
              );

              localStorage.setItem("currentChat", e.target.chatData!.id);

              onValue(
                ref(getdb(), `groups/${e.target.chatData!.id}`),
                async (snapshot) => {
                  if (snapshot.exists() && listContainer) {
                    const texts = snapshot.val().texts || [];
                    const textObjects = Object.values(texts) as any[];

                    const userIds = [
                      ...new Set(textObjects.map((t) => t.userId)),
                    ];

                    await Promise.all(
                      userIds.map((id) => fetchProfileImage(id))
                    );

                    const messagePromises = textObjects.map((textObj) => {
                      const pfp = imageCache.get(textObj.userId) || "";
                      const pfpSrc = pfp ? pfp : defaultProfileUrl;

                      if (textObj.userId === getUserId()) {
                        return `<div class='text-list-sent'> <img class="text-user-icon" src="${pfpSrc}"/> <p>${textObj.text}</p> </div>`;
                      } else {
                        return `<div class="text-list-received"><img class="text-user-icon" src="${pfpSrc}"/><p>${textObj.text}</p> </div>`;
                      }
                    });

                    const chatHtml = messagePromises.join("");

                    listContainer.innerHTML = chatHtml;
                    listContainer.scrollTop = listContainer.scrollHeight;
                  }
                }
              );

              if (chatInterface) {
                chatInterface.classList.remove("chat-interface-hide");
                chatInterface.classList.add("chat-interface-show");
              }

              listContainer &&
                (listContainer.scrollTop = listContainer.scrollHeight);
              if (chatTitle && e.target.chatData) {
                chatTitle.textContent = e.target.chatData.chatName;
              }
            });
          });
        } else {
          console.log("No data available at this path.");
        }
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
      });
  }, [center.lng, center.lat, zoom]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
    </div>
  );
};

export default MapComponent;
