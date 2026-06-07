"""Make the deployer's top-level modules importable from tests/.

pytest adds the rootdir (this file's directory) to sys.path, so tests in tests/ can
``import server`` / ``import config`` / ``import docker_manager``.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
