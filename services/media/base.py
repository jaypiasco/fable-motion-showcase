"""
Abstract Base Interfaces and Data Models for Media Providers.
Defines standard request/response payloads and ABCs for TTS, Image, Video, and Lip-Sync.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# TTS Data Models & ABC
# ============================================================================

class WordTimestamp(BaseModel):
    word: str
    start_sec: float
    end_sec: float


class TTSRequest(BaseModel):
    text: str
    output_path: Path
    voice_id: Optional[str] = None
    rate: Optional[str] = None
    pitch: Optional[str] = None
    model: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class TTSResult(BaseModel):
    audio_path: Path
    duration_seconds: float = 0.0
    words: List[WordTimestamp] = Field(default_factory=list)
    provider: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseTTSProvider(ABC):
    """Abstract interface for Speech & Narration generation."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider unique name identifier."""
        pass

    @abstractmethod
    def generate(self, req: TTSRequest) -> TTSResult:
        """Generates audio file from text and returns audio path + timing metadata."""
        pass


# ============================================================================
# Image Data Models & ABC
# ============================================================================

class ImageGenRequest(BaseModel):
    prompt: str
    output_path: Optional[Path] = None
    aspect_ratio: str = "9:16"
    seed: Optional[int] = None
    negative_prompt: Optional[str] = None
    model: Optional[str] = None
    character_anchors: Optional[str] = None
    character_references: Optional[List[Path]] = None
    involved_characters: Optional[List[Dict[str, Any]]] = None
    setting: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class ImageGenResult(BaseModel):
    image_path: Path
    seed: Optional[int] = None
    provider: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseImageProvider(ABC):
    """Abstract interface for Keyframe and Character Image generation."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider unique name identifier."""
        pass

    @abstractmethod
    def generate(self, req: ImageGenRequest) -> ImageGenResult:
        """Renders visual keyframe from prompt."""
        pass


# ============================================================================
# Video Data Models & ABC
# ============================================================================

class VideoGenRequest(BaseModel):
    motion_prompt: str
    image_path: Path
    output_path: Path
    duration: Optional[int] = None
    aspect_ratio: str = "9:16"
    motion_level: str = "subtle_emotion"
    shot_type: Optional[str] = None
    camera_motion: Optional[str] = "push_in"  # push_in, pull_out, pan_left, pan_right, tension_shake
    model: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class VideoGenResult(BaseModel):
    video_path: Path
    duration: float
    provider: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseVideoProvider(ABC):
    """Abstract interface for Image-to-Video and Motion synthesis."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider unique name identifier."""
        pass

    @abstractmethod
    def generate(self, req: VideoGenRequest) -> VideoGenResult:
        """Generates video clip from keyframe image + motion prompt."""
        pass


# ============================================================================
# Lip-Sync Data Models & ABC
# ============================================================================

class LipSyncRequest(BaseModel):
    video_path: Path
    audio_path: Path
    output_path: Path
    provider: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class LipSyncResult(BaseModel):
    video_path: Path
    provider: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseLipSyncProvider(ABC):
    """Abstract interface for Lip-Sync animation."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider unique name identifier."""
        pass

    @abstractmethod
    def generate(self, req: LipSyncRequest) -> LipSyncResult:
        """Synchronizes character lip movements with dialogue audio."""
        pass
