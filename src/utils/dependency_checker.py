import subprocess
import shutil
import os
from typing import Dict, List, Tuple

class DependencyChecker:
    """Handles system validation for creative software on AlmaLinux."""
    
    def __init__(self):
        self.required_binaries = ["dnf", "flatpak", "rpm"]

    def check_gpu_status(self) -> Dict[str, bool]:
        """Checks if NVIDIA drivers are functional via nvidia-smi."""
        results = {
            "nvidia_present": False,
            "driver_loaded": False
        }
        
        if shutil.which("nvidia-smi"):
            results["nvidia_present"] = True
            try:
                # Run a quick probe to see if the kernel module is responding
                subprocess.run(["nvidia-smi", "-L"], check=True, capture_output=True)
                results["driver_loaded"] = True
            except subprocess.CalledProcessError:
                results["driver_loaded"] = False
        
        return results

    def check_resolve_dependencies(self) -> List[str]:
        """
        Validates libraries required specifically by DaVinci Resolve on EL9.
        Returns a list of missing packages.
        """
        missing = []
        # libxcrypt-compat is the most common reason Resolve fails to launch on EL9
        # mesa-libGLU and libnsl are also common requirements
        critical_libs = [
            ("libxcrypt-compat", "/usr/lib64/libcrypt.so.1"),
            ("libnsl", "/usr/lib64/libnsl.so.1"),
            ("mesa-libGLU", "/usr/lib64/libGLU.so.1")
        ]

        for pkg, path in critical_libs:
            if not os.path.exists(path):
                missing.append(pkg)
        
        return missing

    def is_flatpak_ready(self) -> Tuple[bool, bool]:
        """Checks if flatpak is installed and if Flathub is added."""
        has_flatpak = shutil.which("flatpak") is not None
        has_flathub = False
        
        if has_flatpak:
            result = subprocess.run(
                ["flatpak", "remotes"], 
                capture_output=True, 
                text=True
            )
            has_flathub = "flathub" in result.stdout.lower()
            
        return has_flatpak, has_flathub

    def get_system_report(self) -> Dict:
        """Compiles a full status report for the installer UI."""
        gpu = self.check_gpu_status()
        flatpak_installed, flathub_exists = self.is_flatpak_ready()
        
        return {
            "gpu_driver_ok": gpu["driver_loaded"],
            "resolve_deps_missing": self.check_resolve_dependencies(),
            "flatpak_ok": flatpak_installed,
            "flathub_ok": flathub_exists,
            "is_root": os.geteuid() == 0
        }

if __name__ == "__main__":
    # Quick CLI test
    checker = DependencyChecker()
    report = checker.get_system_report()
    print("--- Pre-flight System Check ---")
    for key, value in report.items():
        status = "PASS" if value and not isinstance(value, list) else "FAIL"
        if isinstance(value, list): status = f"MISSING: {value}" if value else "PASS"
        print(f"{key:25}: {status}")