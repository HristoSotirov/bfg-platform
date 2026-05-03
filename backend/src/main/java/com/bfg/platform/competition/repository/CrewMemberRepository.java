package com.bfg.platform.competition.repository;

import com.bfg.platform.competition.entity.CrewMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface CrewMemberRepository extends JpaRepository<CrewMember, UUID> {

    List<CrewMember> findByEntryIdIn(Collection<UUID> entryIds);

    void deleteByEntryIdIn(Collection<UUID> entryIds);
}
