from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class LivingDonationEpisode(Base):
    """Living donation process entity linking recipient episode and candidate donors."""

    __tablename__ = "EPISODE_LTPL"

    id = Column(
        "ID",
        Integer,
        primary_key=True,
        index=True,
        comment="Technical primary key of the living donation episode.",
        info={"label": "ID"},
    )
    recipient_episode_id = Column(
        "RECIPIENT_EPISODE_ID",
        Integer,
        ForeignKey("EPISODE.ID"),
        nullable=True,
        index=True,
        comment="Recipient episode reference for this living donation process.",
        info={"label": "Recipient Episode"},
    )
    start = Column(
        "START",
        Date,
        nullable=True,
        comment="Start date of the living donation process.",
        info={"label": "Start"},
    )
    end = Column(
        "END",
        Date,
        nullable=True,
        comment="End date of the living donation process.",
        info={"label": "End"},
    )
    comment = Column(
        "COMMENT",
        String(1024),
        default="",
        comment="General comment for this living donation process.",
        info={"label": "Comment"},
    )
    changed_by_id = Column(
        "CHANGED_BY",
        Integer,
        ForeignKey("USER.ID"),
        nullable=True,
        comment="Last user who changed the living donation process.",
        info={"label": "Changed By"},
    )
    created_by_id = Column(
        "CREATED_BY",
        Integer,
        ForeignKey("USER.ID"),
        nullable=True,
        comment="User who created the living donation process.",
        info={"label": "Created By"},
    )
    created_at = Column(
        "CREATED_AT",
        DateTime(timezone=True),
        server_default=func.now(),
        comment="Creation timestamp of the living donation process row.",
        info={"label": "Created At"},
    )
    updated_at = Column(
        "UPDATED_AT",
        DateTime(timezone=True),
        onupdate=func.now(),
        comment="Last update timestamp of the living donation process row.",
        info={"label": "Updated At"},
    )

    recipient_episode = relationship("Episode", back_populates="living_donation_recipient_links")
    donors = relationship("LivingDonationDonor", back_populates="living_donation_episode", cascade="all, delete-orphan")
    organ_links = relationship("LivingDonationEpisodeOrgan", back_populates="living_donation_episode", cascade="all, delete-orphan")
    organs = relationship(
        "Code",
        secondary="EPISODE_LTPL_ORGAN",
        primaryjoin="LivingDonationEpisode.id == LivingDonationEpisodeOrgan.living_donation_episode_id",
        secondaryjoin="and_(Code.id == LivingDonationEpisodeOrgan.organ_id, LivingDonationEpisodeOrgan.is_active == True)",
        viewonly=True,
    )
    changed_by_user = relationship("User", foreign_keys=[changed_by_id])
    created_by_user = relationship("User", foreign_keys=[created_by_id])

    @property
    def organ_ids(self) -> list[int]:
        if self.organs:
            return [organ.id for organ in self.organs if organ and organ.id is not None]
        return []

    @property
    def episode_organs(self) -> list["LivingDonationEpisodeOrgan"]:
        return self.organ_links


class LivingDonationEpisodeOrgan(Base):
    """Link table mapping living donation processes to one or more donation organs."""

    __tablename__ = "EPISODE_LTPL_ORGAN"
    __table_args__ = (UniqueConstraint("EPISODE_LTPL_ID", "ORGAN_ID"),)

    id = Column(
        "ID",
        Integer,
        primary_key=True,
        index=True,
        comment="Technical primary key of the living donation process-organ link.",
        info={"label": "ID"},
    )
    living_donation_episode_id = Column(
        "EPISODE_LTPL_ID",
        Integer,
        ForeignKey("EPISODE_LTPL.ID"),
        nullable=False,
        index=True,
        comment="Living donation process reference.",
        info={"label": "Living Donation Episode"},
    )
    organ_id = Column(
        "ORGAN_ID",
        Integer,
        ForeignKey("CODE.ID"),
        nullable=False,
        index=True,
        comment="Donation organ reference (`CODE.ORGAN`).",
        info={"label": "Organ"},
    )
    is_active = Column(
        "IS_ACTIVE",
        Boolean,
        default=True,
        nullable=False,
        comment="Whether this donation organ relation is currently active for the process.",
        info={"label": "Is Active"},
    )
    date_inactivated = Column(
        "DATE_INACTIVATED",
        Date,
        nullable=True,
        comment="Date when this donation organ relation was inactivated.",
        info={"label": "Date Inactivated"},
    )

    living_donation_episode = relationship("LivingDonationEpisode", back_populates="organ_links")
    organ = relationship("Code", foreign_keys=[organ_id])


class LivingDonationDonor(Base):
    """Candidate donor relation for a living donation process."""

    __tablename__ = "EPISODE_LTPL_DONOR"
    __table_args__ = (UniqueConstraint("EPISODE_LTPL_ID", "DONOR_PATIENT_ID"),)

    id = Column(
        "ID",
        Integer,
        primary_key=True,
        index=True,
        comment="Technical primary key of the living donation donor row.",
        info={"label": "ID"},
    )
    living_donation_episode_id = Column(
        "EPISODE_LTPL_ID",
        Integer,
        ForeignKey("EPISODE_LTPL.ID"),
        nullable=False,
        index=True,
        comment="Living donation process reference.",
        info={"label": "Living Donation Episode"},
    )
    donor_patient_id = Column(
        "DONOR_PATIENT_ID",
        Integer,
        ForeignKey("PATIENT.ID"),
        nullable=False,
        index=True,
        comment="Patient reference for the potential donor.",
        info={"label": "Donor Patient"},
    )
    relation_id = Column(
        "RELATION_ID",
        Integer,
        ForeignKey("CODE.ID"),
        nullable=True,
        comment="Relation code (`CODE.LTPL_DONOR_RELATION`).",
        info={"label": "Recipient-Donor Relation"},
    )
    status_id = Column(
        "STATUS_ID",
        Integer,
        ForeignKey("CODE.ID"),
        nullable=False,
        comment="Donor status code (`CODE.LTPL_DONOR_STATUS`).",
        info={"label": "Donor Status"},
    )
    comment = Column(
        "COMMENT",
        String(512),
        default="",
        comment="Comment for this donor in the process.",
        info={"label": "Comment"},
    )
    changed_by_id = Column(
        "CHANGED_BY",
        Integer,
        ForeignKey("USER.ID"),
        nullable=True,
        comment="Last user who changed this donor row.",
        info={"label": "Changed By"},
    )
    created_by_id = Column(
        "CREATED_BY",
        Integer,
        ForeignKey("USER.ID"),
        nullable=True,
        comment="User who created this donor row.",
        info={"label": "Created By"},
    )
    created_at = Column(
        "CREATED_AT",
        DateTime(timezone=True),
        server_default=func.now(),
        comment="Creation timestamp of the living donation donor row.",
        info={"label": "Created At"},
    )
    updated_at = Column(
        "UPDATED_AT",
        DateTime(timezone=True),
        onupdate=func.now(),
        comment="Last update timestamp of the living donation donor row.",
        info={"label": "Updated At"},
    )

    living_donation_episode = relationship("LivingDonationEpisode", back_populates="donors")
    donor_patient = relationship("Patient", back_populates="living_donation_donor_links")
    relation = relationship("Code", foreign_keys=[relation_id])
    status = relationship("Code", foreign_keys=[status_id])
    changed_by_user = relationship("User", foreign_keys=[changed_by_id])
    created_by_user = relationship("User", foreign_keys=[created_by_id])
