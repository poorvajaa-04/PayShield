from backend.app.evidence.lure.detector import classify as classify_lure
from backend.app.evidence.network.detector import classify as classify_network
from backend.app.evidence.session.detector import classify as classify_session


# ---------- LURE ----------

def test_lure_no_match():
    result = classify_lure(
        "Hello, how are you today?",
        case_id="LURE-001",
    )

    assert result.stream == "lure"
    assert result.probability == 0.02
    assert result.matched_pattern is None
    assert result.case_id == "LURE-001"


def test_lure_fake_authority():
    result = classify_lure(
        "I am from CBI. Your account needs verification.",
        case_id="LURE-002",
    )

    assert result.stream == "lure"
    assert result.probability == 0.53
    assert result.matched_pattern == "fake CBI/police script"


def test_lure_otp_request():
    result = classify_lure(
        "Share the OTP immediately.",
        case_id="LURE-003",
    )

    assert result.probability == 0.71
    assert result.matched_pattern == "OTP-harvesting request"


def test_lure_multiple_patterns():
    result = classify_lure(
        "I am from CBI. Share the OTP immediately or your account will be blocked.",
        case_id="LURE-004",
    )

    assert result.probability == 0.89
    assert result.matched_pattern == "OTP-harvesting request"


def test_lure_remote_access():
    result = classify_lure(
        "Install AnyDesk and share your screen.",
        case_id="LURE-005",
    )

    assert result.probability == 0.53
    assert result.matched_pattern == "remote-access-tool request"


def test_lure_case_insensitive():
    result = classify_lure(
        "SHARE THE OTP",
        case_id="LURE-006",
    )

    assert result.matched_pattern == "OTP-harvesting request"
    assert result.probability == 0.53


# ---------- NETWORK ----------

def test_network_no_anomaly():
    result = classify_network(
        failed_logins=1,
        requests_per_minute=20,
        distinct_source_ips=1,
        case_id="NET-001",
    )

    assert result.stream == "network"
    assert result.probability == 0.03
    assert result.matched_pattern is None


def test_network_credential_stuffing():
    result = classify_network(
        failed_logins=9,
        requests_per_minute=40,
        distinct_source_ips=6,
        case_id="NET-002",
    )

    assert result.probability == 0.87
    assert "credential stuffing" in result.matched_pattern
    assert "9 failed logins" in result.matched_pattern
    assert "6 distinct IPs" in result.matched_pattern


def test_network_brute_force():
    result = classify_network(
        failed_logins=5,
        requests_per_minute=20,
        distinct_source_ips=1,
        case_id="NET-003",
    )

    assert result.probability == 0.65
    assert "brute-force pattern" in result.matched_pattern


def test_network_automated_traffic():
    result = classify_network(
        failed_logins=1,
        requests_per_minute=120,
        distinct_source_ips=1,
        case_id="NET-004",
    )

    assert result.probability == 0.70
    assert "automated traffic" in result.matched_pattern


def test_network_credential_stuffing_takes_priority():
    result = classify_network(
        failed_logins=10,
        requests_per_minute=200,
        distinct_source_ips=6,
        case_id="NET-005",
    )

    assert "credential stuffing" in result.matched_pattern


# ---------- SESSION ----------

def test_session_no_anomaly():
    result = classify_session(
        is_new_device=False,
        geo_velocity_kmph=10,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id="SES-001",
    )

    assert result.stream == "session"
    assert result.probability == 0.05
    assert result.matched_pattern is None


def test_session_remote_access_has_highest_priority():
    result = classify_session(
        is_new_device=True,
        geo_velocity_kmph=1000,
        login_hour_local=2,
        remote_access_tool_detected=True,
        case_id="SES-002",
    )

    assert result.probability == 0.95
    assert "remote-access-tool" in result.matched_pattern


def test_session_impossible_travel():
    result = classify_session(
        is_new_device=False,
        geo_velocity_kmph=801,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id="SES-003",
    )

    assert result.probability == 0.90
    assert "impossible travel" in result.matched_pattern


def test_session_new_device_off_hours():
    result = classify_session(
        is_new_device=True,
        geo_velocity_kmph=10,
        login_hour_local=3,
        remote_access_tool_detected=False,
        case_id="SES-004",
    )

    assert result.probability == 0.75
    assert result.matched_pattern == "new device + off-hours login"


def test_session_new_device_normal_hours():
    result = classify_session(
        is_new_device=True,
        geo_velocity_kmph=10,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id="SES-005",
    )

    assert result.probability == 0.55
    assert result.matched_pattern == "new device"


def test_session_boundary_velocity():
    result = classify_session(
        is_new_device=False,
        geo_velocity_kmph=800,
        login_hour_local=12,
        remote_access_tool_detected=False,
        case_id="SES-006",
    )

    assert result.probability == 0.05
    assert result.matched_pattern is None