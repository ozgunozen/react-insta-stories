import React, { useContext, useState, useRef, useEffect } from "react";
import GlobalContext from "./../context/Global";
import StoriesContext from "./../context/Stories";
import ProgressContext from "./../context/Progress";
import Story from "./Story";
import ProgressArray from "./ProgressArray";
import {
  GlobalCtx,
  StoriesContext as StoriesContextInterface,
} from "./../interfaces";
import useIsMounted from "./../util/use-is-mounted";

export default function () {
  const {
    width,
    height,
    loop,
    currentIndex,
    isPaused,
    keyboardNavigation,
    preventDefault,
    storyContainerStyles = {},
    onAllStoriesEnd,
    onPrevious,
    onNext,
    mutedComponent,
    unmutedComponent,
  } = useContext<GlobalCtx>(GlobalContext);
  const { stories } = useContext<StoriesContextInterface>(StoriesContext);

  const [currentId, setCurrentId] = useState<number>(0);
  const [pause, setPause] = useState<boolean>(true);
  const [mute, setMute] = useState<boolean>(stories[currentId].muted)
  const [bufferAction, setBufferAction] = useState<boolean>(true);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const isMounted = useIsMounted();

  let mousedownId = useRef<any>();

  useEffect(() => {
    if (typeof currentIndex === "number") {
      if (currentIndex >= 0 && currentIndex < stories.length) {
        setCurrentIdWrapper(() => currentIndex);
      } else {
        console.error(
          "Index out of bounds. Current index was set to value more than the length of stories array.",
          currentIndex
        );
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    setMute(stories[currentId].muted)
  }, [currentId, stories]);

  useEffect(() => {
    if (typeof isPaused === "boolean") {
      setPause(isPaused);
    }
  }, [isPaused]);

  useEffect(() => {
    const isClient = typeof window !== "undefined" && window.document;
    if (
      isClient &&
      typeof keyboardNavigation === "boolean" &&
      keyboardNavigation
    ) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [keyboardNavigation]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      previous();
    } else if (e.key === "ArrowRight") {
      next();
    }
  };

  const toggleMute = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (mute) {
      setMute(false)
    } else {
      setMute(true)
    }
  }

  const toggleState = (action: string, bufferAction?: boolean) => {
    setPause(action === "pause");
    setBufferAction(!!bufferAction);
  };

  const setCurrentIdWrapper = (callback) => {
    setCurrentId(callback);
    toggleState("pause", true);
  };

  const previous = () => {
    if(onPrevious != undefined){
      onPrevious();
    }
    setCurrentIdWrapper((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const next = () => {
    if(onNext != undefined){
      onNext();
    }
    // Check if component is mounted - for issue #130 (https://github.com/mohitk05/react-insta-stories/issues/130)
    if (isMounted()) {
      if (loop) {
        updateNextStoryIdForLoop();
      } else {
        updateNextStoryId();
      }
    }
  };

  const updateNextStoryIdForLoop = () => {
    setCurrentIdWrapper((prev) => {
      if (prev >= stories.length - 1) {
        onAllStoriesEnd && onAllStoriesEnd(currentId, stories);
      }
      return (prev + 1) % stories.length;
    });
  };

  const updateNextStoryId = () => {
    setCurrentIdWrapper((prev) => {
      if (prev < stories.length - 1) return prev + 1;
      onAllStoriesEnd && onAllStoriesEnd(currentId, stories);
      return prev;
    });
  };

  const debouncePause = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    mousedownId.current = setTimeout(() => {
      toggleState("pause");
    }, 200);
  };

  const mouseUp =
    (type: string) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      mousedownId.current && clearTimeout(mousedownId.current);
      if (pause) {
        toggleState("play");
      } else {
        type === "next" ? next() : previous();
      }
    };

  const getVideoDuration = (duration: number) => {
    setVideoDuration(duration * 1000);
  };

  return (
    <div
      style={{
        ...styles.container,
        ...storyContainerStyles,
        ...{ width, height },
      }}
    >
      <ProgressContext.Provider
        value={{
          bufferAction: bufferAction,
          videoDuration: videoDuration,
          currentId,
          pause,
          next,
        }}
      >
        <ProgressArray />
      </ProgressContext.Provider>
      <Story
        action={toggleState}
        bufferAction={bufferAction}
        playState={pause}
        mutedState={mute}
        story={stories[currentId]}
        getVideoDuration={getVideoDuration}
      />
      {!preventDefault && (
        <div style={styles.overlay}>
          <div
            style={{ width: "50%", zIndex: 999 }}
            onTouchStart={debouncePause}
            onTouchEnd={mouseUp("previous")}
            onMouseDown={debouncePause}
            onMouseUp={mouseUp("previous")}
          />
          <div
            style={{ width: "50%", zIndex: 999 }}
            onTouchStart={debouncePause}
            onTouchEnd={mouseUp("next")}
            onMouseDown={debouncePause}
            onMouseUp={mouseUp("next")}
          />
          { stories[currentId].type === "video" && 
            <div style={styles.volume} onClick={toggleMute}>{mute ? mutedComponent : unmutedComponent}</div>
          }
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    background: "#111",
    position: "relative" as const,
    WebkitUserSelect: 'none' as const,
  },
  overlay: {
    position: "absolute" as const,
    height: "inherit",
    width: "inherit",
    display: "flex",
  },
  volume: {
    zIndex: 999,
    display: "block",
    position: "absolute" as const,
    bottom: 10,
    right: 10,
  }
};
