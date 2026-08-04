# SPDX-License-Identifier: GPL-3.0-only
#
# Thin compatibility shim: normalises PyQt5 / PyQt6 API differences so the
# rest of the codebase can target the Qt6 API unconditionally.
#
# Key differences handled here:
#   - Enum namespacing  (Qt6 scopes enums; Qt5 does not)
#   - exec() vs exec_() on dialogs / QApplication
#   - QAction location (QtWidgets in Qt5, QtGui in Qt6)

try:
    from PyQt6.QtCore import (
        QObject,
        QPoint,
        QRect,
        QSize,
        Qt,
        QThread,
        QTimer,
    )
    from PyQt6.QtCore import (
        pyqtSignal as Signal,
    )
    from PyQt6.QtGui import (
        QAction,
        QColor,
        QFont,
        QIcon,
        QMovie,
        QPalette,
        QPixmap,
        QTextCursor,
    )
    from PyQt6.QtWidgets import (
        QAbstractItemView,
        QApplication,
        QComboBox,
        QDialog,
        QFileDialog,
        QFrame,
        QGridLayout,
        QHBoxLayout,
        QLabel,
        QLineEdit,
        QListWidget,
        QListWidgetItem,
        QMainWindow,
        QMessageBox,
        QProgressBar,
        QPushButton,
        QScrollArea,
        QSizePolicy,
        QSplitter,
        QStatusBar,
        QTabWidget,
        QTextEdit,
        QToolBar,
        QVBoxLayout,
        QWidget,
    )
    QT_VERSION = 6

except ImportError:
    from PyQt5.QtCore import (
        QObject,
        QPoint,
        QRect,
        QSize,
        Qt,
        QThread,
        QTimer,
    )
    from PyQt5.QtCore import (
        pyqtSignal as Signal,
    )
    from PyQt5.QtGui import (
        QColor,
        QFont,
        QIcon,
        QMovie,
        QPalette,
        QPixmap,
        QTextCursor,
    )
    from PyQt5.QtWidgets import (
        QAbstractItemView,
        QAction,
        QApplication,
        QComboBox,
        QDialog,
        QFileDialog,
        QFrame,
        QGridLayout,
        QHBoxLayout,
        QLabel,
        QLineEdit,
        QListWidget,
        QListWidgetItem,
        QMainWindow,
        QMessageBox,
        QProgressBar,
        QPushButton,
        QScrollArea,
        QSizePolicy,
        QSplitter,
        QStatusBar,
        QTabWidget,
        QTextEdit,
        QToolBar,
        QVBoxLayout,
        QWidget,
    )
    QT_VERSION = 5

    # ------------------------------------------------------------------
    # Backport Qt6 scoped enum namespacing onto Qt5 so call sites don't
    # need version guards.  We only alias what this application uses.
    # ------------------------------------------------------------------
    class _NS:
        """Namespace proxy: _NS(obj, *names) makes obj.Name = obj for each name."""

    def _alias(cls, *attrs):
        for attr in attrs:
            if not hasattr(cls, attr):
                setattr(cls, attr, cls)

    # Qt.AlignmentFlag.AlignLeft  etc.
    _alias(Qt, "AlignmentFlag", "Orientation", "ScrollBarPolicy",
           "WindowType", "ItemFlag", "ItemDataRole", "TextInteractionFlag",
           "FocusPolicy", "CursorShape", "GlobalColor", "MatchFlag",
           "SortOrder", "ToolBarArea", "DockWidgetArea", "CheckState",
           "ConnectionType", "Key", "Modifier",
           "AspectRatioMode", "TransformationMode")

    # QSizePolicy.Policy.Expanding  etc.
    _alias(QSizePolicy, "Policy")

    # QAbstractItemView.SelectionMode  etc.
    _alias(QAbstractItemView, "SelectionMode", "ScrollHint")

    # QFrame.Shape / QFrame.Shadow
    _alias(QFrame, "Shape", "Shadow")

    # QMessageBox.StandardButton / ButtonRole  etc.
    _alias(QMessageBox, "StandardButton", "Icon", "ButtonRole")

    # QFileDialog.Option  etc.
    _alias(QFileDialog, "Option", "FileMode", "AcceptMode")

    # QListWidgetItem.ItemType
    _alias(QListWidgetItem, "ItemType")

    # QTextCursor.MoveOperation.End  etc.
    _alias(QTextCursor, "MoveOperation")

    # exec_() → exec() shim for dialogs/app (Qt5 has both but Qt6 dropped exec_)
    for _cls in (QDialog, QMessageBox, QFileDialog, QApplication):
        if not hasattr(_cls, "exec"):
            _cls.exec = _cls.exec_


__all__ = [
    "QT_VERSION",
    "QAbstractItemView",
    "QAction",
    "QApplication",
    "QColor",
    "QComboBox",
    "QDialog",
    "QFileDialog",
    "QFont",
    "QFrame",
    "QGridLayout",
    "QHBoxLayout",
    "QIcon",
    "QLabel",
    "QLineEdit",
    "QListWidget",
    "QListWidgetItem",
    "QMainWindow",
    "QMessageBox",
    "QMovie",
    "QObject",
    "QPalette",
    "QPixmap",
    "QPoint",
    "QProgressBar",
    "QPushButton",
    "QRect",
    "QScrollArea",
    "QSize",
    "QSizePolicy",
    "QSplitter",
    "QStatusBar",
    "QTabWidget",
    "QTextCursor",
    "QTextEdit",
    "QThread",
    "QTimer",
    "QToolBar",
    "QVBoxLayout",
    "QWidget",
    "Qt",
    "Signal",
]
