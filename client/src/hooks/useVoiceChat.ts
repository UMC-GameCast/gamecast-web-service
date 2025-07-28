import { useState, useEffect, useRef } from "react";
import { WebRTCManager } from "../utils/webRTCManager";

export const useVoiceChat = (roomId: string | null) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const webRTCManagerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    const manager = new WebRTCManager(roomId);
    webRTCManagerRef.current = manager;

    manager.onRemoteStream = (sid, stream) => {
      if (isMounted) {
        setRemoteStreams(prev => new Map(prev).set(sid, stream));
      }
    };

    manager.onUserLeft = (sid) => {
      if (isMounted) {
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(sid);
          return newStreams;
        });
      }
    };

    manager.start().then(stream => {
      if (isMounted && stream) {
        setLocalStream(stream);
      }
    });

    return () => {
      isMounted = false;
      manager.close();
    };
  }, [roomId]);

  return { localStream, remoteStreams };
}; 